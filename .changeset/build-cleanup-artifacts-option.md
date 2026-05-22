---
"hardhat": minor
---

Add a `cleanupArtifacts` option to `SolidityBuildSystem#build`. When `true`, the build system runs `cleanupArtifacts` against the build's root file paths after a successful build, deleting orphan artifacts and unreachable build-info files for the scope.
