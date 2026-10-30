---
"@nomicfoundation/ignition-core": patch
---

Fixed `after` not waiting for the futures of a module's submodules when given a module, and deployments hanging when a module waits on another module whose id is a prefix of its own (e.g. `TokenSale` waiting on `Token`).
