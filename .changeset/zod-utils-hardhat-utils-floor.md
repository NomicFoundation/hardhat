---
"@nomicfoundation/hardhat-zod-utils": patch
---

Fixed `rpcData` parsing `0x` as a zero byte when an older `@nomicfoundation/hardhat-utils` was installed, by requiring 5.1.1 or later.
