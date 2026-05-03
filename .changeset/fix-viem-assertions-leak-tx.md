---
"@nomicfoundation/hardhat-viem-assertions": patch
---

Fix `emit` and `emitWithArgs` leaking the underlying transaction into the next test when the synchronous ABI shape check failed. These helpers now always settle `contractFn` before any assertion can throw.
