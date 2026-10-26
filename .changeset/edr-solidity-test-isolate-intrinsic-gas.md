---
"hardhat": patch
---

Fixed calls and creates in Solidity tests run with `isolate` paying a flat 21,000 intrinsic gas instead of the real intrinsic gas of their transaction, which ignored calldata, access lists, authorizations and init code on every hardfork.
