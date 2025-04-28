---
"hardhat": patch
---

Bumped @ignored/edr to 0.10.0-alpha.3 which brings the following changes:

- Back-ports fuzz and invariant testing improvements from Foundry 1.0 (commit: a2ecefce6), notably:
  - Significant performance improvements
  - Support for afterInvariant function
  - Support for linked artifacts in get*Code cheatcodes
  - Various bug fixes
- fix: support different solc versions for libs and contracts in linker
