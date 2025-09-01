---
"@nomicfoundation/hardhat-verify": patch
---

Fix `ContractInformationResolver` to use optional chaining when accessing compiler output contracts to prevent potential `TypeError` ([#7291](https://github.com/NomicFoundation/hardhat/pull/7291))
