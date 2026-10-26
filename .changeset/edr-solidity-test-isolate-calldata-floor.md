---
"hardhat": patch
---

Fixed calls in Solidity tests run with `isolate` reverting when the gas forwarded to them is below the EIP-7623 floor of their calldata, while the same call succeeds without `isolate`.
