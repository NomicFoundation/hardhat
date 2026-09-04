---
"@nomicfoundation/hardhat-viem-assertions": patch
---

Fixed `balancesHaveChanged` not adding the gas fee back to the sender's balance when the sender address is passed in its checksummed form.
