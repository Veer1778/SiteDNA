// Flat config (ESLint 9+). Type-aware linting is deliberately skipped here (no `project`
// option) to keep lint fast in CI; `tsc -b` in the build step already catches type errors.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {
    ignores: ["**/dist/**", "**/.turbo/**", "**/node_modules/**", "**/coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Zod schema files declare a lot of `type X = z.infer<...>` right after the const —
      // that's the intended pattern here, not dead code.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  // Must be last: turns off stylistic rules that would conflict with Prettier's formatting.
  eslintConfigPrettier,
];
