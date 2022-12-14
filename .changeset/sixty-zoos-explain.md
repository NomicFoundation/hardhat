---
"hardhat": patch
---

Fixed a bug when `gasPrice` was set to `"auto"`, which is the default configuration when connecting to a JSON-RPC network. This bug was preventing the results from `eth_feeHistory` from being used when they should.
