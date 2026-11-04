---
"@nomicfoundation/hardhat-ledger": major
"@nomicfoundation/hardhat-errors": patch
---

Breaking change: scripts that sign with a Ledger must now call `await connection.close()` to exit. If you use `@nomicfoundation/hardhat-ignition`, update it too.
