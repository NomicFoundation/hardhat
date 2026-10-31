---
"hardhat": patch
---

Fixed `eth_call` and `eth_estimateGas` without `gas` failing at remote blocks of a fork, when the network's hardfork is older than the forked chain's. Requests without `gas` now default to the gas limit of the block they run at, capped by its hardfork, so they follow a forked chain's block gas limit and `evm_setBlockGasLimit`.
