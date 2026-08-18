---
"hardhat": patch
---

Fixed the `int`, `bigint` and `float` CLI argument types rejecting hexadecimal values containing the digit `f`/`F` (e.g. `0xff`, `0xdeadbeef`).
