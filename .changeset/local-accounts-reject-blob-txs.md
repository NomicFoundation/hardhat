---
"hardhat": patch
"@nomicfoundation/hardhat-errors": patch
---

Fixed locally managed accounts silently dropping the blobs of EIP-4844 transactions; sending one now throws an error.
