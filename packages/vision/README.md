# @brandkit/vision

Provider-agnostic Vision AI interface (`VisionProvider`) that classifies design language,
brand personality, voice, and photography/illustration style from screenshots. One concrete
implementation (Anthropic API, model configurable via env, no hardcoded keys) ships in Phase 3
(see [Claude.md](../../Claude.md)). All tests run against a fake provider with recorded
responses — zero live API calls in CI.

## Current state (Phase 0)

Stub only — exports `PACKAGE_NAME` so the package is genuinely buildable and testable ahead of
Phase 3's classification logic.

## Build/test in isolation

```sh
pnpm --filter @brandkit/vision build
pnpm --filter @brandkit/vision test
```
