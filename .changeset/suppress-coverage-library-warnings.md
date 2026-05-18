---
"hardhat": patch
---

Suppress Solidity compiler warnings emitted against the synthetic `__NomicFoundationCoverage` library file injected by the coverage hook, so `--coverage` runs no longer surface warnings users cannot fix.
