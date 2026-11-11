---
"hardhat": patch
---

Thanks @popescuoctavian! Fixed Solidity tests switching to the default hardfork after `vm.createSelectFork`, `vm.selectFork` or `vm.rollFork`, instead of keeping the configured hardfork or inline `evm_version`.
