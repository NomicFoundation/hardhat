---
"hardhat": patch
---

Fixed EIP-8037 state gas not being accounted for in Solidity tests running on the Amsterdam hardfork, so `Vm.Gas.gasStateUsed` is now reported, and `Vm.Gas.gasTotalUsed` excludes state gas that spilled past the reservoir.
