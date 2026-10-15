---
"hardhat": patch
---

Fixed the transaction `Value` in the `hardhat node` logs dropping leading zeros of the fractional part (`0.01 ETH` was logged as `0.1 ETH`) and whole amounts ending with a trailing dot.
