---
"@nomicfoundation/hardhat-ethers-chai-matchers": patch
---

The broad `.revert(ethers)` matcher now recognizes EVM execution failures that some providers report without revert data, such as invalid opcode, out-of-gas, and other exceptional halts. Reason-specific matchers like `.revertedWith` are unchanged and still require revert data.
