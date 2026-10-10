---
"@nomicfoundation/hardhat-network-helpers": patch
---

Fixed zero written as a hex string with leading zeros, like `"0x00"`, being converted to the invalid quantity `"0x"`, which made `time.increase("0x00")` throw `SyntaxError: Cannot convert 0x to a BigInt`.
