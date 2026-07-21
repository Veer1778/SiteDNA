/**
 * Enforces the monorepo's layering rules from Claude.md:
 *   - no circular dependencies, anywhere
 *   - nothing under packages/ may depend on apps/web (apps/web is the top of the graph)
 * Run via `pnpm check:deps`.
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies make build order and reasoning about the graph impossible.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-package-depends-on-app",
      severity: "error",
      comment: "apps/web is the top of the dependency graph; packages must not depend on it.",
      from: { path: "^packages" },
      to: { path: "^apps" },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "types", "node", "default"],
    },
    doNotFollow: {
      path: "node_modules",
    },
  },
};
