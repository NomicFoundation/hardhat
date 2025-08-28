---
"@nomicfoundation/hardhat-node-test-reporter": patch
---

Fix test error logs being cut off. The default is now 5 lines (up from 3). In CI environments, it shows 100 lines for more detail.
