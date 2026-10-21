---
"hardhat": patch
---

Fixed the `GASLIMIT` opcode returning `1_000_000` while the block gas limit is disabled; it now returns the parent block's gas limit, which the mined block's header already carried.
