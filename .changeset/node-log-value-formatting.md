---
"hardhat": patch
---

Fixed the transaction `Value` in the `hardhat node` logs dropping leading zeros of the fractional part, which logged `0.01 ETH` as `0.1 ETH`. Whole amounts no longer end with a trailing dot.
