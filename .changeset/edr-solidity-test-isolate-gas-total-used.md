---
"hardhat": patch
---

Changed `Vm.Gas.gasTotalUsed` in Solidity tests run with `isolate` to report the regular gas of the transaction before refunds, with `gasRefunded` reported separately.
