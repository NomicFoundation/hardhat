---
"@nomicfoundation/hardhat-ignition": patch
---

Updated the `ignition deploy`, `ignition track-tx` and `ignition verify` tasks to close their network connection when they finish, so Hardhat exits after using `@nomicfoundation/hardhat-ledger`.
