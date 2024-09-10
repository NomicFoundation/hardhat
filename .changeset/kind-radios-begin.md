---
"@nomicfoundation/hardhat-viem": patch
---

Moved types to `HardhatViemHelpers` and initialized `ContractTypesMap` as empty for better extensibility. Improved performance by disabling retries in dev nets (thanks @TateB!)
