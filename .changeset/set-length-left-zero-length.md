---
"@nomicfoundation/hardhat-utils": patch
---

Fixed `setLengthLeft` returning the whole hex string instead of `0x` when truncating to a length of `0`.
