---
"hardhat": patch
---

Changed `snapshotGasLastCall`, `snapshotGasLastFrame` and `startSnapshotGas`/`stopSnapshotGas` in Solidity tests run with `isolate` to report the receipt gas of the transaction, so the value no longer depends on the gas forwarded to the call or on refunds.
