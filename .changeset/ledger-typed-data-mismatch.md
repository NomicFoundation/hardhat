---
"@nomicfoundation/hardhat-ledger": patch
"@nomicfoundation/hardhat-errors": patch
---

Added an error when the Ledger can't sign `eth_signTypedData_v4` data exactly as provided, for example when a field name contains only digits.
