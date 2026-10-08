---
"@nomicfoundation/hardhat-ledger": patch
---

Added a check that every `eth_signTypedData_v4` signature matches the submitted typed data, rejecting malformed inputs the device would otherwise sign as a different message.
