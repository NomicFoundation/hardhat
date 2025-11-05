---
"hardhat": patch
---

Fixed a bug that occurred when multiple contracts shared the same dependencies and the `isolated` property was set to true in the build profile ([7660](https://github.com/NomicFoundation/hardhat/pull/7660)).
