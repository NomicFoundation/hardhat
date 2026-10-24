---
"@nomicfoundation/hardhat-utils": patch
---

Fixed `hexStringToBytes` converting `0x` and the empty string to a zero byte instead of empty bytes.
