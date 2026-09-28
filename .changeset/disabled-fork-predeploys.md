---
"hardhat": patch
---

Fixed `edr-simulated` networks with `forking.enabled: false` starting without the chain's predeploys (e.g. OP's `GasPriceOracle` and `L1Block`, or the L1 beacon roots and history storage contracts).
