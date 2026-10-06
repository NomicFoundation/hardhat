---
"hardhat": patch
---

`eth_call` and `eth_estimateGas` requests without an explicit `gas` field no longer fail under the Osaka transaction gas cap.
