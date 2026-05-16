---
"@nomicfoundation/hardhat-ethers-chai-matchers": patch
"@nomicfoundation/hardhat-utils": patch
"@nomicfoundation/ignition-core": patch
---

Accept no-data EVM execution failures from `eth_call` and `eth_estimateGas` in the broad `.revert(ethers)` matcher, expose a shared EVM execution-error message helper, and use it in Ignition call handling.
