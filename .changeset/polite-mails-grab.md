---
"@nomicfoundation/hardhat-node-test-reporter": patch
---

Fix test error `cause` chains being cut off. The default is now 10 `cause`s (up from 3). In CI environments, it's 100.
