---
"@nomicfoundation/hardhat-ethers": patch
---

Fixed the default gas limit of transactions sent over `localhost` to a Hardhat node running the `amsterdam` hardfork, which was capped at 2^24 and ran out of gas for large deployments.
