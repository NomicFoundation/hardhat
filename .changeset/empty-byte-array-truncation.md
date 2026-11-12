---
"@nomicfoundation/hardhat-utils": patch
---

Fixed `setLengthLeft` returning the whole byte array instead of an empty array when truncating to a length of `0`.
