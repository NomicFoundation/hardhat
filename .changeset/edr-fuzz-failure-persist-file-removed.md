---
"hardhat": minor
---

Thanks @popescuoctavian! BREAKING CHANGE: The `failurePersistFile` fuzz option is now ignored; Solidity fuzz failures are always persisted under `failures` in `failurePersistDir`, as in Foundry.
