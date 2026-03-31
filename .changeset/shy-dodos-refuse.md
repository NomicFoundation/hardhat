---
"@nomicfoundation/ignition-core": patch
"@nomicfoundation/hardhat-errors": patch
---

Handle mempool lag in nonce validation by retrying before erroring on stale pending counts ([8092](https://github.com/NomicFoundation/hardhat/issues/8092)).
