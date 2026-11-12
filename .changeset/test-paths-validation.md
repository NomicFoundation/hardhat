---
"hardhat": patch
"@nomicfoundation/hardhat-mocha": patch
"@nomicfoundation/hardhat-node-test-runner": patch
---

Fixed `paths.tests.solidity`, `paths.tests.mocha` and `paths.tests.nodejs` not being validated, so a value that isn't a string failed with a `TypeError` instead of a config error.
