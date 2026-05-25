---
"hardhat": patch
---

- Fixed default gas limit of Solidity test runner when a custom transaction gas cap (EIP-7825) or block gas limit is specified
- Fixed process deadlock/hang when dropping a provider with interval mining and logging enabled.
- Print more detailed error descriptions for EVM, invariant fuzz, and cheatcode errors
