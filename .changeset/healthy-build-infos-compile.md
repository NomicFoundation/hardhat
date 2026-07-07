---
"hardhat": patch
---

Fix `SolidityBuildSystem#compileBuildInfo` so build infos produced by non-solc compiler types are replayed through the Solidity compiler hooks.
