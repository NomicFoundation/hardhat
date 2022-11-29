---
"hardhat": patch
---

Fixed an edge case where Hardhat would hang if `debug_traceTransaction` was used with an OOG transaction sent to a precompile.
