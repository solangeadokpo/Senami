# syntax=docker/dockerfile:1

# Senami API. Multi-stage: dependencies and build tooling never reach the
# runtime image, which holds the compiled code, production dependencies and
# the migrations only.
#
#   docker build -t senami-api .
#   docker run --env-file .env -p 3000:3000 senami-api

ARG NODE_VERSION=24

# --- base: Node and the pnpm version pinned in package.json -----------------
FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app
# Manifests first: the dependency layers are rebuilt only when they change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack install

# --- build: every dependency, then compile ----------------------------------
FROM base AS build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm build

# --- prod-deps: runtime dependencies only -----------------------------------
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod

# --- runtime ----------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
# tini as PID 1: forwards SIGTERM to Node (graceful shutdown) and reaps zombies.
# npm and corepack are useless at runtime. Removing them shrinks the attack
# surface, not the image (they stay in the base layer).
RUN apk add --no-cache tini \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

# Owned by root and read-only for the `node` user: the process cannot alter
# its own code.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY drizzle ./drizzle

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health/live').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--enable-source-maps", "dist/main.js"]
