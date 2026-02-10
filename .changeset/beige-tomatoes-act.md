---
"@nomicfoundation/hardhat-verify": patch
---

Expose an `Etherscan` instance through the `verification` property on `network.connect()` for advanced use cases. This version also adds a `customApiCall` method to the Etherscan instance, allowing custom requests to the Etherscan API ([#7644](https://github.com/NomicFoundation/hardhat/issues/7644))
