---
"@nomiclabs/hardhat-ethers": patch
---

Added new helper `getImpersonatedSigner()`, a shorthand for invoking the `hardhat_impersonateAccount` JSON-RPC method followed immediately by `ethers.getSigner()`.
