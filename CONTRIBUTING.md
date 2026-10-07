# Contributing

## Setup

1. Node.js 24, pnpm 12, Docker.
2. `pnpm install` at the root: it installs the git hooks.
3. Install and run the project you work on, following its README, e.g.
   [`backend/README.md`](backend/README.md).

## Repository layout

Each project (`backend/`, `web/`, `mobile/`) is standalone: its own
`package.json`, lockfile, Prettier and ESLint configuration, and its own
`docs/conventions.md` describing the structure and practices to follow. Read
it before your first change in a project.

The root holds only what is shared by the whole repository: the git hooks and
the commit message rules.

## Branches

| Branch             | Role                                                      |
| ------------------ | --------------------------------------------------------- |
| `main`             | production; only receives merges from `develop`           |
| `develop`          | integration; the base of every branch                     |
| `<type>/<subject>` | one per task: `feat/student-import`, `fix/numbering-race` |

- Branch from an up-to-date `origin/develop` (`git fetch` first).
- One task per branch. Never commit straight onto `develop` or `main`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org), enforced by the
`commit-msg` hook:

```
<type>(<scope>): <subject>
```

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
  `build`, `ci`, `chore`, `revert`.
- Scope: the project or the area touched: `backend`, `web`, `mobile`, a
  module name (`students`), `db`, `config`, `deps`.
- Subject: imperative, lower case, no final period, 50 characters max.
- Body: what and why, wrapped at 72 characters.
- Breaking change: `!` after the scope and a `BREAKING CHANGE:` footer.

## Git hooks

| Hook         | Runs                                                                |
| ------------ | ------------------------------------------------------------------- |
| `pre-commit` | lint-staged, with each project's `.lintstagedrc.json` (Prettier, ESLint) |
| `commit-msg` | commitlint                                                          |
| `pre-push`   | `typecheck` and unit tests of every project                         |

Do not bypass them with `--no-verify`. If a hook fails, fix the cause.

## Feature work

1. A new feature starts with a spec in
   `<project>/docs/features/<resource>/<feature>.md`: purpose, **tree**,
   behaviour (with examples), affected areas, new files, tests, dependencies,
   out of scope. Reference the requirement ids of the functional
   specification (`DEC-04`, `HL-06`...).
2. The **tree** shows every folder and file the feature creates or modifies,
   marked `(new)` or `(modified)`, each with a few words on its role. It comes
   right after the purpose: the structure is validated before anything else.

   ```
   src/modules/students/                    (new)
   ├── students.module.ts                   (new)  wiring
   ├── controllers/students.controller.ts   (new)  CRUD and import endpoints
   └── services/students.service.ts         (new)  import rules
   src/modules/modules.module.ts            (modified)  registers StudentsModule
   ```

3. The spec is reviewed, tree included, before the code is written.
4. Tests follow the spec: one per behaviour and per failure case.
5. A change to an existing feature updates its spec, its tree and its tests.

## Pull requests

Run the checks of the project first (listed in its `docs/conventions.md`).
The pull request:

- targets `develop` and covers one subject;
- links the feature spec and the requirement ids it implements;
- for a database change: includes the migration and updates
  `backend/docs/database.md` and `backend/docs/database.puml`.

## Rules that are never negotiable

- No accident sheet content stored on the server: not in a table, a queue, a
  cache or a log.
- No access to another establishment's data.
- No price or purchase link in the mobile app.
- No real personal data in development or tests.

## Code style

- English for code, comments, commits and documentation; French for the text
  end users read.
- No em dash anywhere.
- Prettier formats, ESLint checks: do not hand-format.
