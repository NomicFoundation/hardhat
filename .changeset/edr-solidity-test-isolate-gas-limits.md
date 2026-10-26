---
"hardhat": patch
---

Fixed calls and creates in Solidity tests run with `isolate` being checked against the transaction gas cap and the block gas limit, which the enclosing test transaction already satisfies.
