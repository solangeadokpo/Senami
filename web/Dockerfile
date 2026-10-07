# syntax=docker/dockerfile:1

# Senami web: showcase site and back office. Multi-stage: the runtime image
# holds the standalone Next.js server and its static files only.
#
# NEXT_PUBLIC_* and the API rewrite are fixed at build time: they are build
# arguments, and the server reads the same values again at runtime.
#
#   docker build -t senami-web --build-arg API_URL=... \
#     --build-arg NEXT_PUBLIC_SITE_URL=... --build-arg NEXT_PUBLIC_APP_URL=... .

ARG NODE_VERSION=24

# --- base: Node and the pnpm version pinned in package.json -----------------
FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app
# Manifests first: the dependency layer is rebuilt only when they change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack install

# --- build -------------------------------------------------------------------
FROM base AS build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json next.config.ts postcss.config.mjs ./
COPY public ./public
COPY src ./src
ARG API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_APP_URL
ENV API_URL=${API_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
RUN pnpm build

# --- runtime ----------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
# tini as PID 1: forwards SIGTERM to Node and reaps zombies. npm and corepack
# are useless at runtime.
RUN apk add --no-cache tini \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Owned by root and read-only for the `node` user.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
