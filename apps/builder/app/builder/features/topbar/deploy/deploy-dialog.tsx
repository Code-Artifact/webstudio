import {
  useState,
  useEffect,
  type FormEvent,
} from "react";
import { useStore } from "@nanostores/react";
import {
  Button,
  Flex,
  Grid,
  Text,
  InputField,
  Label,
  theme,
  toast,
  Link,
  Tooltip,
  ScrollArea,
  css,
  SmallIconButton,
} from "@webstudio-is/design-system";
import {
  CheckCircleIcon,
  AlertIcon,
  TrashIcon,
  RefreshIcon,
} from "@webstudio-is/icons";
import { $project } from "~/shared/nano-states";
import { nativeClient } from "~/shared/trpc/trpc-client";

type SiteMeta = {
  slug: string;
  deployedAt: string;
  updatedAt: string;
  url: string;
};

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
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

function validateSlugClient(slug: string): string | null {
  if (slug.length < 3) {
    return "Slug must be at least 3 characters";
  }
  if (slug.length > 50) {
    return "Slug must be at most 50 characters";
  }
  if (!SLUG_REGEX.test(slug)) {
    return "Only lowercase letters, numbers, and hyphens allowed. Must start and end with a letter or number.";
  }
  if (RESERVED_SLUGS.has(slug)) {
    return `"${slug}" is a reserved name`;
  }
  return null;
}

// This is used for preview display only; the actual URL comes from the deploy API response
const DEPLOY_BASE_URL = "https://example.com";

// Helper to get the static export zip from the existing export pipeline
async function buildStaticSite(
  projectId: string
): Promise<{ name: string } | { error: string }> {
  const result = await nativeClient.domain.publish.mutate({
    projectId,
    destination: "static",
    templates: ["ssg"],
  });

  if (result.success === false) {
    return { error: result.error };
  }

  const name = "name" in result ? result.name : undefined;
  if (!name) {
    return { error: "Build failed: no file name returned" };
  }

  // Poll for build completion
  const POLL_INTERVAL = 5000;
  const MAX_POLLS = 36; // 3 minutes

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

    const projectResult = await nativeClient.domain.project.query({
      projectId,
    });

    if (!projectResult.success) {
      continue;
    }

    const build = projectResult.project.latestStaticBuild;
    if (build == null) {
      continue;
    }

    const delta = Date.now() - new Date(build.updatedAt).getTime();
    if (build.publishStatus === "PUBLISHED") {
      return { name };
    }
    if (
      build.publishStatus === "FAILED" ||
      (build.publishStatus === "PENDING" && delta > 180000)
    ) {
      return { error: "Static site build failed" };
    }
  }

  return { error: "Build timed out" };
}

async function fetchStaticZip(name: string): Promise<Blob> {
  const response = await fetch(`/cgi/static/ssg/${name}`);
  if (!response.ok) {
    throw new Error(`Failed to download static site: ${response.statusText}`);
  }
  return response.blob();
}

// API calls
async function deploySite(
  slug: string,
  zipBlob: Blob,
  method: "POST" | "PUT"
): Promise<{ success: boolean; site?: SiteMeta; error?: string }> {
  const formData = new FormData();
  formData.append("slug", slug);
  formData.append("file", zipBlob, "site.zip");

  const response = await fetch("/rest/deploy", {
    method,
    body: formData,
  });

  return response.json();
}

async function listSites(): Promise<SiteMeta[]> {
  const response = await fetch("/rest/deploy");
  const data = await response.json();
  return data.success ? data.sites : [];
}

async function deleteSite(
  slug: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch("/rest/deploy", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  return response.json();
}

const tabStyle = css({
  padding: `${theme.spacing[3]} ${theme.spacing[5]}`,
  cursor: "pointer",
  borderBottom: "2px solid transparent",
  color: theme.colors.foregroundSubtle,
  "&:hover": {
    color: theme.colors.foregroundMain,
  },
  variants: {
    active: {
      true: {
        borderBottomColor: theme.colors.foregroundMain,
        color: theme.colors.foregroundMain,
      },
    },
  },
});

// Deploy Tab Content
const DeployTab = () => {
  const project = useStore($project);
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "building" | "deploying" | "success" | "error"
  >("idle");
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSlugChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(normalized);
    if (normalized.length > 0) {
      setSlugError(validateSlugClient(normalized));
    } else {
      setSlugError(null);
    }
  };

  const handleDeploy = async (event: FormEvent) => {
    event.preventDefault();

    const validationError = validateSlugClient(slug);
    if (validationError) {
      setSlugError(validationError);
      return;
    }

    if (!project) {
      toast.error("No project loaded");
      return;
    }

    try {
      // Step 1: Build static site
      setStatus("building");
      const buildResult = await buildStaticSite(project.id);

      if ("error" in buildResult) {
        setStatus("error");
        setErrorMessage(buildResult.error);
        return;
      }

      // Step 2: Download the zip
      const zipBlob = await fetchStaticZip(buildResult.name);

      // Step 3: Deploy to server
      setStatus("deploying");
      const deployResult = await deploySite(slug, zipBlob, "POST");

      if (!deployResult.success) {
        setStatus("error");
        setErrorMessage(deployResult.error ?? "Deploy failed");
        return;
      }

      setStatus("success");
      setDeployedUrl(deployResult.site?.url ?? `${DEPLOY_BASE_URL}/${slug}`);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  const isDisabled = status === "building" || status === "deploying";
  const previewUrl = slug
    ? `${DEPLOY_BASE_URL}/${slug}`
    : `${DEPLOY_BASE_URL}/your-slug`;

  return (
    <form onSubmit={handleDeploy}>
      <Grid columns={1} gap={3} css={{ padding: theme.panel.padding }}>
        <Grid columns={1} gap={2}>
          <Label htmlFor="deploy-slug">Site slug</Label>
          <InputField
            id="deploy-slug"
            placeholder="my-campaign"
            value={slug}
            onChange={(event) => handleSlugChange(event.target.value)}
            disabled={isDisabled}
            color={slugError ? "error" : undefined}
          />
          {slugError && (
            <Text color="destructive" variant="tiny">
              {slugError}
            </Text>
          )}
          <Text color="subtle" variant="tiny">
            Preview URL: {previewUrl}
          </Text>
        </Grid>

        {status === "success" && deployedUrl && (
          <Flex gap={2} align="center">
            <CheckCircleIcon color="green" />
            <Text color="positive">
              Deployed!{" "}
              <Link
                href={deployedUrl}
                target="_blank"
                rel="noreferrer"
                color="inherit"
              >
                {deployedUrl}
              </Link>
            </Text>
          </Flex>
        )}

        {status === "error" && errorMessage && (
          <Flex gap={2} align="center">
            <AlertIcon color="red" />
            <Text color="destructive">{errorMessage}</Text>
          </Flex>
        )}

        <Button
          type="submit"
          color="positive"
          disabled={isDisabled || slug.length === 0 || slugError !== null}
          state={isDisabled ? "pending" : undefined}
        >
          {status === "building"
            ? "Building static site..."
            : status === "deploying"
              ? "Deploying..."
              : "Deploy"}
        </Button>
      </Grid>
    </form>
  );
};

// Manage Tab Content
const ManageTab = () => {
  const project = useStore($project);
  const [sites, setSites] = useState<SiteMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingSlug, setUpdatingSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadSites = async () => {
    setLoading(true);
    try {
      const data = await listSites();
      setSites(data);
    } catch {
      toast.error("Failed to load deployed sites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const handleUpdate = async (slug: string) => {
    if (!project) {
      toast.error("No project loaded");
      return;
    }

    setUpdatingSlug(slug);
    try {
      const buildResult = await buildStaticSite(project.id);
      if ("error" in buildResult) {
        toast.error(buildResult.error);
        return;
      }

      const zipBlob = await fetchStaticZip(buildResult.name);
      const deployResult = await deploySite(slug, zipBlob, "PUT");

      if (!deployResult.success) {
        toast.error(deployResult.error ?? "Update failed");
        return;
      }

      toast.info(`Site "${slug}" updated successfully`);
      await loadSites();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Update failed"
      );
    } finally {
      setUpdatingSlug(null);
    }
  };

  const handleDelete = async (slug: string) => {
    if (confirmDelete !== slug) {
      setConfirmDelete(slug);
      return;
    }

    setDeletingSlug(slug);
    try {
      const result = await deleteSite(slug);
      if (!result.success) {
        toast.error(result.error ?? "Delete failed");
        return;
      }
      toast.info(`Site "${slug}" deleted`);
      setConfirmDelete(null);
      await loadSites();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Delete failed"
      );
    } finally {
      setDeletingSlug(null);
    }
  };

  if (loading) {
    return (
      <Flex
        justify="center"
        css={{ padding: theme.panel.padding }}
      >
        <Text color="subtle">Loading deployed sites...</Text>
      </Flex>
    );
  }

  if (sites.length === 0) {
    return (
      <Flex
        justify="center"
        css={{ padding: theme.panel.padding }}
      >
        <Text color="subtle">No sites deployed yet</Text>
      </Flex>
    );
  }

  return (
    <ScrollArea css={{ maxHeight: 400 }}>
      <Grid columns={1} gap={2} css={{ padding: theme.panel.padding }}>
        {sites.map((site) => (
          <Grid
            key={site.slug}
            columns={1}
            gap={1}
            css={{
              padding: theme.spacing[5],
              borderRadius: theme.borderRadius[4],
              border: `1px solid ${theme.colors.borderMain}`,
            }}
          >
            <Flex justify="between" align="center">
              <Text variant="labelsTitleCase" truncate>
                {site.slug}
              </Text>
              <Flex gap={1}>
                <Tooltip content="Update with current project">
                  <SmallIconButton
                    type="button"
                    aria-label="Update"
                    disabled={updatingSlug === site.slug}
                    onClick={() => handleUpdate(site.slug)}
                  >
                    <RefreshIcon />
                  </SmallIconButton>
                </Tooltip>
                <Tooltip
                  content={
                    confirmDelete === site.slug
                      ? "Click again to confirm"
                      : "Delete site"
                  }
                >
                  <SmallIconButton
                    type="button"
                    aria-label="Delete"
                    disabled={deletingSlug === site.slug}
                    onClick={() => handleDelete(site.slug)}
                  >
                    <TrashIcon />
                  </SmallIconButton>
                </Tooltip>
              </Flex>
            </Flex>

            <Link
              href={site.url}
              target="_blank"
              rel="noreferrer"
              variant="mono"
              color="subtle"
            >
              {site.url}
            </Link>

            <Flex gap={3}>
              <Text color="subtle" variant="tiny">
                Deployed: {new Date(site.deployedAt).toLocaleDateString()}
              </Text>
              <Text color="subtle" variant="tiny">
                Updated: {new Date(site.updatedAt).toLocaleDateString()}
              </Text>
            </Flex>

            {updatingSlug === site.slug && (
              <Text color="subtle" variant="tiny">
                Updating...
              </Text>
            )}
          </Grid>
        ))}
      </Grid>
    </ScrollArea>
  );
};

export const DeployDialogContent = () => {
  const [activeTab, setActiveTab] = useState<"deploy" | "manage">("deploy");

  return (
    <Grid columns={1}>
      <Flex css={{ borderBottom: `1px solid ${theme.colors.borderMain}` }}>
        <button
          type="button"
          className={tabStyle({ active: activeTab === "deploy" })}
          onClick={() => setActiveTab("deploy")}
        >
          <Text variant="labelsTitleCase">Deploy</Text>
        </button>
        <button
          type="button"
          className={tabStyle({ active: activeTab === "manage" })}
          onClick={() => setActiveTab("manage")}
        >
          <Text variant="labelsTitleCase">Manage</Text>
        </button>
      </Flex>

      {activeTab === "deploy" && <DeployTab />}
      {activeTab === "manage" && <ManageTab />}
    </Grid>
  );
};
