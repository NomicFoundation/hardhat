---
"hardhat": patch
"@nomicfoundation/hardhat-errors": patch
---

Fixed `hardhat flatten` silently producing a misleading output for projects with cyclic Solidity dependencies. The task now throws `HHE602` (FLATTEN_CYCLIC_DEPENDENCY) listing the files that form the cycle, restoring the behavior of Hardhat 2's `HH603` (#7611).
