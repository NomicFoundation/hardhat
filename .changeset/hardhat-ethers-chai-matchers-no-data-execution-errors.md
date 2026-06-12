---
"@nomicfoundation/hardhat-ethers-chai-matchers": patch
---

The broad `.revert(ethers)` matcher now recognizes EVM execution failures that some providers report without revert data, such as invalid opcode and out-of-gas errors. This makes `.revert(ethers)` behave consistently across providers that omit revert data on these failures. Reason-specific matchers like `.revertedWith` are unchanged and still require revert data.

As a consequence, `.not.to.be.revert(ethers)` now fails for these no-data execution failures, since they are treated as reverts.
