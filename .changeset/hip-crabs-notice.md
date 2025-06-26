---
"@nomicfoundation/example-project": patch
"@nomicfoundation/hardhat-errors": patch
"@nomicfoundation/hardhat-ignition-ethers": patch
"@nomicfoundation/hardhat-ignition-viem": patch
"@nomicfoundation/hardhat-ignition": patch
"@nomicfoundation/hardhat-node-test-reporter": patch
"@nomicfoundation/hardhat-utils": patch
"hardhat": patch
---

Revamp the dependency resolution system: adding support for `remappings.txt` files, dropping support for `remappings` from the config, and changing how remappings into npm packages are written. 
