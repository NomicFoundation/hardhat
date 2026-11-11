---
"@nomicfoundation/hardhat-ethers": patch
---

Fixed `HardhatEthersSigner.sendTransaction` hanging forever instead of rejecting when fetching the sent transaction fails.
