---
"@nomicfoundation/hardhat-node-test-reporter": patch
---

Counted a `describe` callback that throws or rejects as a failure, so `hardhat test` no longer exits 0 when one fails ([#8793](https://github.com/NomicFoundation/hardhat/issues/8793)).
