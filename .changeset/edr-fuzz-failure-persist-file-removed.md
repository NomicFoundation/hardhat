---
"hardhat": minor
---

Thanks @popescuoctavian! BREAKING CHANGE: Removed the `failurePersistFile` Solidity fuzz option, and setting it is now a config error. When `failurePersistDir` is set, failures are persisted under `failures`.
