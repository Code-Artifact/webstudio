import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import * as fs from "node:fs";
import * as path from "node:path";

const SITES_DIR = process.env.SITES_DIR ?? "/app/sites";
const DEPLOY_BASE_URL =
  process.env.DEPLOY_BASE_URL ?? "https://example.com";

const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "www",
  "static",
  "assets",
  "cgi",
  "health",
  "status",
]);

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

function validateSlug(slug: string): string | null {
  if (!SLUG_REGEX.test(slug)) {
    return "Slug must be 3-50 characters, alphanumeric and hyphens only, must start and end with alphanumeric character";
  }
  if (RESERVED_SLUGS.has(slug)) {
    return `"${slug}" is a reserved name and cannot be used`;
  }
  return null;
}

function getSlugDir(slug: string): string {
  return path.join(SITES_DIR, slug);
}

function getMetaPath(slug: string): string {
  return path.join(getSlugDir(slug), "_meta.json");
}

type SiteMeta = {
  slug: string;
  deployedAt: string;
  updatedAt: string;
  url: string;
};

function readMeta(slug: string): SiteMeta | null {
  const metaPath = getMetaPath(slug);
  if (!fs.existsSync(metaPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(metaPath, "utf-8"));
}

function writeMeta(slug: string, meta: SiteMeta): void {
  fs.writeFileSync(getMetaPath(slug), JSON.stringify(meta, null, 2));
}

// GET /rest/deploy — list all deployed sites
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    if (!fs.existsSync(SITES_DIR)) {
      fs.mkdirSync(SITES_DIR, { recursive: true });
    }

    const entries = fs.readdirSync(SITES_DIR, { withFileTypes: true });
    const sites: SiteMeta[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const meta = readMeta(entry.name);
        if (meta) {
          sites.push(meta);
        }
      }
    }

    return json({ success: true, sites });
  } catch (error) {
    console.error("Deploy list error:", error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};

// POST /rest/deploy — deploy new site
// PUT /rest/deploy — update existing site
// DELETE /rest/deploy — delete a site
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method === "POST" || request.method === "PUT") {
      return await handleDeploy(request);
    }

    if (request.method === "DELETE") {
      return await handleDelete(request);
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    console.error("Deploy action error:", error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
};

async function handleDeploy(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  let slug: string;
  let zipData: ArrayBuffer;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    slug = (formData.get("slug") as string) ?? "";
    const file = formData.get("file") as File | null;
    if (!file) {
      return json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }
    zipData = await file.arrayBuffer();
  } else {
    return json(
      { success: false, error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  // Validate slug
  const slugError = validateSlug(slug);
  if (slugError) {
    return json({ success: false, error: slugError }, { status: 400 });
  }

  // Guard against path traversal
  const resolvedDir = path.resolve(SITES_DIR, slug);
  if (!resolvedDir.startsWith(path.resolve(SITES_DIR))) {
    return json(
      { success: false, error: "Invalid slug" },
      { status: 400 }
    );
  }

  const slugDir = getSlugDir(slug);
  const isUpdate = request.method === "PUT";
  const exists = fs.existsSync(slugDir);

  // POST (new deploy): slug must not exist
  if (!isUpdate && exists) {
    return json(
      {
        success: false,
        error: `Site "${slug}" already exists. Use update to replace it.`,
      },
      { status: 409 }
    );
  }

  // PUT (update): slug must exist
  if (isUpdate && !exists) {
    return json(
      { success: false, error: `Site "${slug}" does not exist.` },
      { status: 404 }
    );
  }

  // Ensure sites directory exists
  if (!fs.existsSync(SITES_DIR)) {
    fs.mkdirSync(SITES_DIR, { recursive: true });
  }

  // For updates, clear existing directory (except _meta.json initially)
  if (isUpdate) {
    const oldMeta = readMeta(slug);
    fs.rmSync(slugDir, { recursive: true, force: true });
    fs.mkdirSync(slugDir, { recursive: true });
    // Preserve original deployedAt
    if (oldMeta) {
      writeMeta(slug, {
        ...oldMeta,
        updatedAt: new Date().toISOString(),
      });
    }
  } else {
    fs.mkdirSync(slugDir, { recursive: true });
  }

  // Extract zip to slug directory
  const zipBuffer = Buffer.from(zipData);
  await extractZip(zipBuffer, slugDir);

  // Write or update metadata
  const now = new Date().toISOString();
  const existingMeta = readMeta(slug);
  const meta: SiteMeta = {
    slug,
    deployedAt: existingMeta?.deployedAt ?? now,
    updatedAt: now,
    url: `${DEPLOY_BASE_URL}/${slug}`,
  };
  writeMeta(slug, meta);

  return json({
    success: true,
    site: meta,
    message: isUpdate
      ? `Site "${slug}" updated successfully`
      : `Site "${slug}" deployed successfully`,
  });
}

async function handleDelete(request: Request) {
  const { slug } = (await request.json()) as { slug: string };

  if (!slug) {
    return json(
      { success: false, error: "Slug is required" },
      { status: 400 }
    );
  }

  const slugDir = getSlugDir(slug);
  if (!fs.existsSync(slugDir)) {
    return json(
      { success: false, error: `Site "${slug}" does not exist` },
      { status: 404 }
    );
  }

  fs.rmSync(slugDir, { recursive: true, force: true });

  return json({
    success: true,
    message: `Site "${slug}" deleted successfully`,
  });
}

async function extractZip(
  zipBuffer: Buffer,
  targetDir: string
): Promise<void> {
  // We handle the uploaded file as a zip. Use the unzip approach.
  // Since Node doesn't have built-in zip extraction, we'll write the buffer
  // to a temp file and use the `unzip` command, or handle tar.gz.
  // For simplicity, let's use a manual approach with the `AdmZip` pattern.

  const tmpFile = path.join(SITES_DIR, `_tmp_${Date.now()}.zip`);
  fs.writeFileSync(tmpFile, zipBuffer);

  try {
    // Use Node.js child_process to unzip
    const { execSync } = await import("node:child_process");
    execSync(`unzip -o "${tmpFile}" -d "${targetDir}"`, {
      stdio: "pipe",
    });
  } finally {
    // Clean up temp file
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }
}
