---
"hardhat": patch
---

Fixed `hardhat test solidity <file>` not identifying the project contracts that the selected tests import, which left call traces undecoded or wrongly named, made invariant tests fail with "No contracts to fuzz", and left those contracts out of `--gas-stats`.
