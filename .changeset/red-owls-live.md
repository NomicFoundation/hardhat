---
"@nomicfoundation/hardhat-verify": patch
"@nomicfoundation/hardhat-errors": patch
---

Improved `hardhat verify` to fail faster when the block explorer reports that the constructor arguments are incorrect.

Thanks to @gultekinmakif for the original idea and implementation in #8333.
