---
"@nomicfoundation/hardhat-ethers-chai-matchers": patch
---

Make `revertedWith`, `revertedWithoutReason`, `revertedWithPanic`, and `revertedWithCustomError` wait for transaction receipts before asserting on resolved transaction responses.
