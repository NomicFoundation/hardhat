---
"@nomicfoundation/hardhat-ethers": patch
---

Fixed two issues related to `contract.on` (https://github.com/NomicFoundation/hardhat/issues/4098). The first one was about events with indexed arguments not being handled correctly. The second one was related to transactions that emitted the same event twice or more.
