---
"@nomicfoundation/hardhat-ethers": patch
---

Fixed the EIP-4844 fields being dropped when copying a transaction request, and `blobVersionedHashes` being dropped from JSON-RPC requests, matching ethers.
