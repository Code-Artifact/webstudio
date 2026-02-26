FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.14.4 --activate
WORKDIR /app

# Install all dependencies (dev + prod)
FROM base AS dependencies
COPY . .
RUN pnpm install --frozen-lockfile

# Build everything (workspace packages + builder)
FROM dependencies AS build
RUN pnpm build

# Production runtime
FROM base AS runtime
RUN apk add --no-cache unzip

# Copy everything from build stage (includes built lib/ dirs and build/ output)
COPY --from=build /app /app

# Prune dev dependencies
RUN pnpm install --frozen-lockfile --prod

# Create sites directory for deploy feature
RUN mkdir -p /app/sites

WORKDIR /app/apps/builder
EXPOSE 3000
CMD ["pnpm", "start"]
