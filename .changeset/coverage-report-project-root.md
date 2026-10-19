---
"hardhat": patch
---

Fixed `--coverage` crashing when generating the report if Hardhat is run from a directory other than the project root (e.g. a subdirectory, or with `--config`).
