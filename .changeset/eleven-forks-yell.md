---
"@nomicfoundation/hardhat-errors": patch
"@nomicfoundation/hardhat-utils": patch
"hardhat": patch
---

Delegate Solidity test inline configuration parsing and validation to EDR instead of handling it in Hardhat.
Invalid directives are now reported using EDR's diagnostics.
