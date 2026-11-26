---
"hardhat": patch
---

Thanks @anaPerezGhiglia! Fixed `eth_estimateGas` over-estimating at historical blocks on forked chains whose hardfork differs from the configured one.
