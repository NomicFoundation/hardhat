---
"hardhat": patch
---

Fixed the format of fuzz test counterexamples: byte array values such as `calldata`, `sender` and `address` are now printed as hexadecimal strings (e.g. `0x3e2033b3...`) instead of comma-separated byte lists.
