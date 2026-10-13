---
"hardhat": patch
---

Improved the error for bare-filename imports of local files (e.g. import "Token.sol"), which now suggests the equivalent relative import instead of reporting invalid npm import syntax.
