---
"hardhat": minor
---

Deprecate the following `SolidityHooks`: `getCompiler`, `onCleanUpArtifacts`, `preprocessProjectFileBeforeBuilding`, `preprocessSolcInputBeforeBuilding`, `readSourceFile`, `invokeSolc`, and `readNpmPackageRemappings`. They will be removed in a future release.

Use `processArtifactsAfterSuccessfulBuild` instead of `onCleanUpArtifacts`, and `getCompilationJobErrors` instead of `invokeSolc`.
