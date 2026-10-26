---
"hardhat": patch
---

Fixed calls and creates in Solidity tests run with `isolate` reporting zero gas and returning the forwarded gas to the caller when their intrinsic gas or calldata floor exceeded it; they now consume their whole budget.
