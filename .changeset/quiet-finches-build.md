---
"@nomicfoundation/hardhat-verify": patch
"@nomicfoundation/hardhat-errors": patch
---

`hardhat-verify` now detects when the local artifacts were compiled with a different build profile than the one being used for verification, and shows an error pointing at the correct profile instead of the generic deployed-bytecode-mismatch.
