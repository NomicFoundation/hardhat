---
"hardhat": minor
---

Thanks @popescuoctavian! BREAKING CHANGE: `maxTestRejects: 0` now disables the `vm.assume` reject limit in Solidity fuzz tests, instead of failing on the first rejected input, and requires a fuzz `timeout`.
