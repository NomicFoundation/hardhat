---
"@nomicfoundation/hardhat-ledger": minor
---

Migrated the plugin from the deprecated LedgerJS packages to Ledger's Device Management Kit. Hardhat no longer exits on its own after using the Ledger, so end scripts with `await connection.close()` and update `@nomicfoundation/hardhat-ignition` alongside.
