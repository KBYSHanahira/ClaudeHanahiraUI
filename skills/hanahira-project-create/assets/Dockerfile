# Multi-stage: build with full toolchain, run from a slim image.
# One pinned version for both stages, so build and runtime match and
# rebuilds of the same commit are reproducible.
ARG BUN_VERSION=<bun-version>
FROM oven/bun:${BUN_VERSION} AS build
WORKDIR /app

# Copy manifests first so dependency layers cache across source edits.
COPY package.json bun.lock* bun.lockb* ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:${BUN_VERSION}-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# The server is bundled by `bun build` (hono and mysql2 included), so the
# runtime needs no node_modules — skipping them drops ~58 MB of dev tooling.
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

# Run as the image's non-root user.
USER bun

# No EXPOSE: under host networking it does nothing. The port comes from PORT in .env.
CMD ["bun", "run", "dist/server/index.js"]
