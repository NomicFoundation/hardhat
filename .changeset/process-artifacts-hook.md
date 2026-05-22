---
"hardhat": minor
---

Add `SolidityHooks#processArtifactsAfterSuccessfulBuild` hook to let plugins post-process the artifacts. The hook receives the resolved build options as a new exported `ResolvedBuildOptions` type.
