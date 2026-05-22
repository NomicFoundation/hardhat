---
"hardhat": patch
"@nomicfoundation/hardhat-errors": patch
---

Fixed `hardhat flatten` silently producing a misleading output for projects with cyclic Solidity dependencies.
