---
"@nomicfoundation/hardhat-mocha": patch
---

Fixed `paths.tests.mocha` not being validated, so a value that isn't a string is now reported as an `HHE15` config error.
