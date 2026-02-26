FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate
WORKDIR /app

# Install prod dependencies only
FROM base AS dependencies-env
COPY . /app/
RUN pnpm install --frozen-lockfile --prod

# Build with all dependencies (dev + prod)
FROM base AS build-env
COPY . /app/
RUN pnpm install --frozen-lockfile
RUN pnpm build
# Verify build output exists
RUN ls -la /app/apps/builder/build/server/index.js

# Production runtime
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate
RUN apk add --no-cache unzip
WORKDIR /app

# Copy package files and prod node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
COPY patches /app/patches
COPY apps/builder/package.json /app/apps/builder/
COPY packages /app/packages
COPY --from=dependencies-env /app/node_modules /app/node_modules

# Copy built workspace packages (lib/ dirs) from build stage
COPY --from=build-env /app/packages /app/packages

# Copy built builder app from build stage
COPY --from=build-env /app/apps/builder/build /app/apps/builder/build
COPY --from=build-env /app/apps/builder/public /app/apps/builder/public

# Create sites directory for deploy feature
RUN mkdir -p /app/sites

WORKDIR /app/apps/builder
EXPOSE 3000
CMD ["pnpm", "start"]
