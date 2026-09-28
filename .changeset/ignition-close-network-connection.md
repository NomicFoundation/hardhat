---
"@nomicfoundation/hardhat-ignition": patch
---

The `deploy`, `track-tx` and `verify` tasks now close their network connection when they finish. Plugins can hold resources open on a connection until it is closed, and `@nomicfoundation/hardhat-ledger` keeps the USB session to the device open, which would otherwise keep Hardhat running after the task ended. Update it together with `@nomicfoundation/hardhat-ledger`.
