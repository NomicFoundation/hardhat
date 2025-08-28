---
"@nomicfoundation/hardhat-errors": patch
"@nomicfoundation/hardhat-ignition-ethers": patch
"@nomicfoundation/hardhat-ignition-viem": patch
---

Added guard to stop multiple simultaneous calls to `ignition.deploy(...)` at once ([#6440](https://github.com/NomicFoundation/hardhat/issues/6440))
