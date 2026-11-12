---
"@nomicfoundation/hardhat-ledger": patch
"@nomicfoundation/hardhat-errors": patch
---

Added an error when `eth_signTypedData_v4` data uses a type or field name a Ledger can't sign: a name made only of digits, `__proto__`, or a field declared twice in the same type.
