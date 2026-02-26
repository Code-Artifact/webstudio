FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate
WORKDIR /app

# Install dependencies
FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY apps/builder/package.json apps/builder/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile

# Build the application
FROM dependencies AS build
COPY . .
RUN pnpm build

# Production runtime
FROM base AS runtime
RUN apk add --no-cache unzip
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY apps/builder/package.json apps/builder/
COPY packages/ packages/
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/apps/builder/build apps/builder/build
COPY --from=build /app/apps/builder/public apps/builder/public

# Create sites directory for deploy feature
RUN mkdir -p /app/sites

WORKDIR /app/apps/builder
EXPOSE 3000
CMD ["pnpm", "start"]
