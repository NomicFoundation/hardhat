---
"@nomicfoundation/hardhat-ethers": major
---

`HardhatEthersSigner.sendTransaction` no longer resolves ENS names or validates the from field. Instead, it always uses the signer's address. This matches how viem wallet clients already behave.
