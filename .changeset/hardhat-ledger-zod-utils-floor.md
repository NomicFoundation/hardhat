---
"@nomicfoundation/hardhat-ledger": patch
---

Fixed `data: "0x"` being parsed as one zero byte when an older `@nomicfoundation/hardhat-zod-utils` was installed, by requiring 3.0.9 or later ([#8790](https://github.com/NomicFoundation/hardhat/issues/8790)).
