---
"hardhat": patch
---

Improved validation for `initialDate` network configuration. Invalid `Date` objects and unparseable date `string`s are now rejected during config loading rather than causing a runtime error later.
