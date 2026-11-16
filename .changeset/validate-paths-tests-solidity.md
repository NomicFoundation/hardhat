---
"hardhat": patch
---

Fixed `paths.tests.solidity` not being validated, so a value that isn't a string is now reported as an `HHE15` config error.
