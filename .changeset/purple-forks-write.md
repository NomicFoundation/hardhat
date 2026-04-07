---
"@nomicfoundation/hardhat-ethers-chai-matchers": patch
"@nomicfoundation/hardhat-toolbox-mocha-ethers": patch
"@nomicfoundation/hardhat-ignition-ethers": patch
"@nomicfoundation/hardhat-network-helpers": patch
"@nomicfoundation/hardhat-viem-assertions": patch
"@nomicfoundation/hardhat-ignition-viem": patch
"@nomicfoundation/hardhat-toolbox-viem": patch
"@nomicfoundation/hardhat-ignition": patch
"@nomicfoundation/hardhat-errors": patch
"@nomicfoundation/hardhat-ethers": patch
"@nomicfoundation/hardhat-ledger": patch
"@nomicfoundation/hardhat-verify": patch
"@nomicfoundation/ignition-core": patch
"@nomicfoundation/hardhat-viem": patch
"hardhat": patch
---

Deprecate the `hre.network.connect()` method in favour of `hre.network.create()`, exactly the same method but more clearly indicating that it will create a new connection.
