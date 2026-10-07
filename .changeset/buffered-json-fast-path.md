---
"hardhat": patch
"@nomicfoundation/hardhat-utils": patch
---

Sped up compilation by reading and writing solc's output with `JSON.parse` and `JSON.stringify` when memory allows ([#8565](https://github.com/NomicFoundation/hardhat/issues/8565)).
