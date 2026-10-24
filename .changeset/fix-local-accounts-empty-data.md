---
"hardhat": patch
---

Fixed local accounts signing `data: "0x"` as calldata `0x00`, and `personal_sign` of `0x` as a one-byte message.
