---
"hardhat": patch
---

Add a `toolVersionsInBuildInfo` setting to the Solidity Build Profiles, which is `true` by default in the `production` build profile. When enabled, the version of Hardhat is included in the Build Info files.

NOTE: This change can lead to build info ids changing, despite compilation output's bytecodes being identical, especially when using the `production` build profile.
