---
"@nomicfoundation/hardhat-node-test-runner": patch
"@nomicfoundation/hardhat-mocha": patch
"hardhat": patch
---

All test runners now set NODE_ENV to "test" in case it is not set before the tests start
