---
"@nomicfoundation/hardhat-ledger": major
"@nomicfoundation/hardhat-errors": patch
---

Migrated to Ledger's Device Management Kit, adding EIP-7702 support. Hardhat no longer exits on its own after using the Ledger, so end scripts with `await connection.close()` and update `@nomicfoundation/hardhat-ignition` alongside.
