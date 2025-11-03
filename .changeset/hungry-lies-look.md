---
"@nomicfoundation/hardhat-verify": patch
"@nomicfoundation/hardhat-utils": patch
"hardhat": patch
---

Fixed Etherscan verification failures by removing hardcoded v1 API URLs from chain descriptors ([#7623](https://github.com/NomicFoundation/hardhat/issues/7623)). Also enhanced config resolution to support partial overrides in block explorer configurations for future extensibility.
