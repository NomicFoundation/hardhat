---
"hardhat": patch
---

Fixed Solidity stack traces after a precompile call. A failing precompile call is now reported as a precompile error, and later calls in the same function point at the right line.
