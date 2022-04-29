---
"hardhat": patch
---

Expand the `data` object returned by the JSON-RPC response when a transaction or call reverts. Now it also includes the `message` and `data` fields. The `message` is the same message that is part of the response, and it's included to make things work better with ethers.js. The `data` field includes the return data of the transaction. These fields are included in the responses of the `eth_sendTransaction`, `eth_sendRawTransaction`, `eth_call` and `eth_estimateGas` methods when they revert.
