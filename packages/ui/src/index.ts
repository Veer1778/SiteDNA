/**
 * Package identity, used by tooling (CI, dependency-cruiser) to confirm the package builds and
 * is importable. Shared shadcn/ui components are added as `apps/web` and `packages/editor`
 * need them.
 */
export const PACKAGE_NAME = "@brandkit/ui" as const;
