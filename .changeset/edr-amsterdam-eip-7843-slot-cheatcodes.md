---
"hardhat": minor
---

Thanks @popescuoctavian! Added the `rollSlot(uint64)` and `getSlotNumber()` cheatcodes, which set and read `block.slotnum` (EIP-7843) in Solidity tests without changing the block number or timestamp; both revert on EVM versions before Amsterdam.
