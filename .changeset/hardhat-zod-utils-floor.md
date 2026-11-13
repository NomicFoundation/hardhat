---
"hardhat": patch
---

Fixed local accounts signing `"0x"` data and messages as the byte `0x00` when an older `@nomicfoundation/hardhat-zod-utils` was installed ([#8790](https://github.com/NomicFoundation/hardhat/issues/8790)).
