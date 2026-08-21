# syntax=docker/dockerfile:1

# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable

# Install only the API and its workspace dependencies (skips the heavy
# mobile/Expo workspace to keep the image small).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.json .npmrc ./
COPY artifacts/api-server/package.json artifacts/api-server/package.json
COPY lib/db/package.json lib/db/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
RUN pnpm install --filter "@workspace/api-server..."

COPY . .
RUN pnpm --filter @workspace/api-server run build

# ─── Runtime stage ───────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime
WORKDIR /app
RUN corepack enable
COPY --from=build /app /app

EXPOSE 3000
ENV PORT=3000 \
    NODE_ENV=production
ENTRYPOINT ["sh", "artifacts/api-server/docker-entrypoint.sh"]
