---
"@nomicfoundation/hardhat-ethers": patch
---

Add a per-network `ethers.waitForTransactionReceipts` option that makes `HardhatEthersSigner.sendTransaction` wait until the transaction receipt is available before resolving.
