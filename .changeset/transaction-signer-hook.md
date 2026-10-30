---
"@nomicfoundation/hardhat-errors": patch
"hardhat": minor
---

Added the `network#resolveTransactionSigner` hook, so plugins can sign transactions that Hardhat fills, for accounts whose keys Hardhat doesn't hold.
