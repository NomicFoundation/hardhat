---
"hardhat": patch
---

Fix JSON-RPC `error.data` shape for revert errors (code 3): return the raw revert hex string directly instead of a `{ message, txHash, data }` wrapper object. This matches the geth/anvil/EVM-node convention that client tooling (viem, ethers, web3.js) relies on when decoding custom errors. Closes #8075.
