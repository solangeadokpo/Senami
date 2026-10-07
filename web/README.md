# Senami web

The showcase site and the back office, in one Next.js app. Both talk to the
API only: no database access from here.

| Zone          | Production host | Local host                  | Who                                           |
| ------------- | --------------- | --------------------------- | --------------------------------------------- |
| Showcase site | `www.senami.fr` | `http://localhost:3001`     | visitors: demo and registration requests      |
| Back office   | `app.senami.fr` | `http://app.localhost:3001` | establishment managers, the platform operator |

`*.localhost` resolves to your machine in browsers and on most systems: no
hosts file to edit.

## Getting started

Prerequisites: Node.js 24, pnpm 12, and the API running (see
[`../backend/README.md`](../backend/README.md)).

```bash
pnpm install
cp .env.example .env
pnpm dev              # http://localhost:3001 and http://app.localhost:3001
```

### Environment

| Variable               | What                                                       |
| ---------------------- | ---------------------------------------------------------- |
| `API_URL`              | the API, without `/api/v1`, e.g. `http://localhost:3000`   |
| `NEXT_PUBLIC_SITE_URL` | the showcase site URL                                      |
| `NEXT_PUBLIC_APP_URL`  | the back office URL; its host selects the back office zone |

`dev`, `build` and `start` refuse to run while a variable is missing or is
not a URL: the error names it. `NEXT_PUBLIC_*` values are written into the
browser bundle at build time, so a change needs a new build. `.env` is never
committed.

The API must allow the back office origin: `http://app.localhost:3001` is in
the `CORS_ORIGINS` of `backend/.env.example`; add it to your own
`backend/.env`.

## Scripts

| Script                           | What                                                                 |
| -------------------------------- | -------------------------------------------------------------------- |
| `pnpm dev`                       | development server on port 3001                                      |
| `pnpm build`, `pnpm start`       | production build and server                                          |
| `pnpm typecheck`, `pnpm lint`    | TypeScript, ESLint                                                   |
| `pnpm format`                    | Prettier (with the Tailwind class order)                             |
| `pnpm test`                      | unit and component tests (Vitest, Testing Library)                   |
| `pnpm test:e2e`                  | builds with test URLs, starts on port 3101, runs Playwright          |
| `pnpm docker:up` / `docker:down` | the web app in the local Docker stack                                |
| `pnpm api:types`                 | regenerates `src/core/api/schema.d.ts` from the API OpenAPI document |

The first `pnpm test:e2e` needs the browser: `pnpm exec playwright install
chromium`. It rebuilds `.next` with test URLs: run `pnpm build` again before
`pnpm start`.

`pnpm api:types` reads `http://localhost:3000/api/docs-json`, served by the
API outside production (`pnpm start:dev` in `backend/`). Another address:
`API_DOCS_URL=http://localhost:3010/api/docs-json pnpm api:types`. Commit the
regenerated file with the change that needs it.

## Docker

The [`Dockerfile`](Dockerfile) builds a standalone Next.js server; it runs as
the unprivileged `node` user behind `tini`, with a read-only filesystem. The
URLs are build arguments, since Next.js writes them into the bundle. In the
local stack (root [`docker-compose.yml`](../docker-compose.yml)), the `web`
service serves http://localhost:3001 and http://app.localhost:3001 and calls
the `api` service:

```bash
pnpm docker:up       # PostgreSQL, migrations, API, then the web app
pnpm docker:logs
pnpm docker:down
```

## Layout

See [`docs/conventions.md`](docs/conventions.md).

## Documentation

| Document                                     | What                        |
| -------------------------------------------- | --------------------------- |
| [`docs/conventions.md`](docs/conventions.md) | structure and practices     |
| `docs/features/<area>/<feature>.md`          | the screens of each feature |
