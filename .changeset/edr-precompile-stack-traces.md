---
"hardhat": patch
---

Fixed Solidity stack traces after a precompile call, so a failing precompile call is reported as a precompile error and later calls in the same function point at the right line.
