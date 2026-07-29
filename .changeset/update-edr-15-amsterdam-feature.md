---
"hardhat": minor
#docs: https://github.com/NomicFoundation/hardhat-website/pull/289
---

Added experimental EIP-7843 support to the Amsterdam hardfork: blocks now include the `slotNumber` header field, and the `SLOTNUM` (`0x4b`) opcode returns it. EDR has no consensus layer, so the value is simulated: it increments by one per mined block, starting at 0 on a new chain, or from the forked block's slot number when forking.
