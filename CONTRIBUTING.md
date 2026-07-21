# Contributing

## Dev setup

1. Install Node 20+ (see `.nvmrc`) and pnpm 9 (`corepack enable` will pick up the
   `packageManager` field in `package.json`).
2. `pnpm install` from the repo root — this links all workspace packages.
3. `pnpm build` once to populate every package's `dist/` (needed for cross-package imports to
   resolve types during development).

## Verification commands

Run before opening a PR, and after any change:

```sh
pnpm build       # tsc -b in every package; also the type-check
pnpm test        # vitest run, per package
pnpm lint        # eslint, per package
pnpm check:deps  # dependency-cruiser: no cycles, no packages/* -> apps/web
pnpm format:check
```

All must pass. `pnpm format` fixes formatting issues automatically.

## Branching and commits

- Feature branches off `main`; no direct commits to `main`.
- [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`,
  `docs:`, `test:`, `refactor:`, scoped where useful, e.g. `feat(shared): add shadow schema`.
- One logical change per commit.

## Adding a new package

1. Create `packages/<name>/{src,package.json,tsconfig.json,vitest.config.ts,README.md}`.
2. `package.json`: name it `@brandkit/<name>`, `"type": "module"`, `build`/`test`/`lint`
   scripts matching the other packages (see any existing package for the pattern), and list
   `@brandkit/shared` as a dependency only if the package actually imports from it.
3. `tsconfig.json`: `"extends": "../../tsconfig.base.json"`, and add a `"references"` entry for
   any workspace package it imports from (required for TypeScript project references / `tsc -b`
   to build in the right order).
4. Add the package to `tsconfig.json`'s root `references` array and to
   `.github/workflows/ci.yml` implicitly via `pnpm build`/`test`/`lint` (Turborepo picks up new
   workspace packages automatically — no config change needed there).
5. Write a real `src/index.ts` — no placeholder/TODO exports. If the package genuinely has no
   logic yet, export a `PACKAGE_NAME` identity constant (see any Phase 0 stub package) and a
   test asserting it, so `pnpm build`/`test` have something real to verify.

## Code conventions

See the "Rules" section in [Claude.md](./Claude.md) — strict TypeScript (no `any`), Zod at
every package boundary, small pure functions, named constants over magic numbers, no
placeholder implementations or TODOs in core paths.

## PR checklist

- [ ] `pnpm build && pnpm test && pnpm lint && pnpm check:deps` all pass
- [ ] New/changed Brand JSON fields have JSDoc and are reflected in `docs/BRAND_JSON.md`
- [ ] New packages have a README following the pattern in `packages/shared/README.md`
- [ ] Commit messages follow Conventional Commits
- [ ] No scope creep beyond the phase/task at hand (flag anything out-of-scope you noticed
      instead of fixing it inline)
