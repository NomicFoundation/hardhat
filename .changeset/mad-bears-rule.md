---
"@nomicfoundation/hardhat-node-test-reporter": patch
---

Surfaced Solidity stack traces from `SolidityError` causes in the node test reporter. Failures from viem and ethers contract calls now render a dedicated `Solidity stack trace:` section instead of a deeply nested viem cause chain.
