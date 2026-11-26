---
"@nomicfoundation/hardhat-ledger": patch
---

Fixed blob transactions from Ledger accounts being signed without their blobs. They now fail with an error.
