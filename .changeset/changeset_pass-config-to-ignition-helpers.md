---
"@nomicfoundation/hardhat-ignition-ethers": patch
"@nomicfoundation/hardhat-ignition-viem": patch
---

fix(ignition): Pass global `hre.config.ignition` to the Ethers/Viem Ignition helper implementations so `ignition.deploy()` respects project-level defaults (e.g. `requiredConfirmations`, `blockPollingInterval`) when invoked from scripts. Also adds tests to verify propagation and precedence:

default config < global Hardhat config < per-deploy config.