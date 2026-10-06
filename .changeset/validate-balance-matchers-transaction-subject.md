---
"@nomicfoundation/hardhat-ethers-chai-matchers": patch
---

Added validation for the subject of `changeTokenBalance`, `changeTokenBalances`, `changeEtherBalance`, and `changeEtherBalances` to produce a clear error message when the subject is not a transaction response.
