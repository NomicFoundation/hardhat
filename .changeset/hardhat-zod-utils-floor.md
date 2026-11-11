---
"hardhat": patch
---

Fixed local accounts signing `data: "0x"` as calldata `0x00`, and `personal_sign` or `eth_sign` of `"0x"` as the one-byte message `0x00`, when an older `@nomicfoundation/hardhat-zod-utils` was installed, by requiring 3.0.9 or later ([#8790](https://github.com/NomicFoundation/hardhat/issues/8790)).
