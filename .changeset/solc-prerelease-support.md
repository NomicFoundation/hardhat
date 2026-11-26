---
"hardhat": minor
"@nomicfoundation/hardhat-utils": minor
---

Added support for solc prereleases (e.g. `0.9.0-pre.1`). A prerelease is only used when its full version is set explicitly in the Solidity config, and is matched against version pragmas the same way solc does: as lower than the release it precedes.
