---
# docs: https://github.com/NomicFoundation/hardhat-website/pull/292
"hardhat": minor
---

Add `gasEstimationMode` config option to EDR networks, featuring a `"noInternalOutOfGas"` mode to prevent misleading `eth_estimateGas` results when internal calls run out of gas.
