---
"hardhat": patch
---

Fixed the HD wallet derivation-path validator so malformed paths containing stray colons (e.g. `m:/44'/60'/0'/0`) are rejected with the `INVALID_HD_PATH` error instead of being forwarded to the key-derivation library, which threw a low-level error.
