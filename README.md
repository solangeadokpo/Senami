# Senami

Senami lets school staff declare a minor accident ("accident bénin") from a
phone or a tablet in a few minutes. The declaration produces the
establishment's accident sheet as a PDF, emailed to its management. **No sheet,
photo or PDF is kept on the server.**

The product is sold by subscription to schools in France (multi-establishment
SaaS) and is made of four parts:

| Part          | Who uses it                                   | Stack                       |
| ------------- | --------------------------------------------- | --------------------------- |
| Mobile app    | School staff, to declare                      | React Native (Expo)         |
| Back office   | Establishment managers, the platform operator | Next.js                     |
| Showcase site | Visitors: demo and registration requests      | Next.js (same project)      |
| API           | All of the above                              | NestJS, Drizzle, PostgreSQL |

## Repository

One git repository, several **standalone projects**. Each project has its own
dependencies, lockfile, formatting, linting and documentation.

```
.
├── backend/          API (NestJS, Drizzle ORM, PostgreSQL)
├── web/              showcase site and back office (Next.js)
├── mobile/           mobile app (to come)
├── .husky/           git hooks, shared by every project
└── CONTRIBUTING.md   branches, commits, pull requests
```

The root only holds what belongs to the repository as a whole: the git hooks
and the commit message rules.

## Getting started

Prerequisites: Node.js 24, pnpm 12, Docker.

```bash
pnpm install          # at the root: installs the git hooks
cd backend && pnpm install
```

Then follow the README of each project:
[`backend/README.md`](backend/README.md), then
[`web/README.md`](web/README.md), which needs the API running.

## Documentation

| Document                                                     | What                              |
| ------------------------------------------------------------ | --------------------------------- |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)                         | branches, commits, hooks, reviews |
| [`backend/docs/conventions.md`](backend/docs/conventions.md) | backend structure and practices   |
| [`backend/docs/database.md`](backend/docs/database.md)       | data model                        |
| [`web/docs/conventions.md`](web/docs/conventions.md)         | web structure and practices       |

## License

Proprietary. All rights reserved by HDE - QUANTIQ.
