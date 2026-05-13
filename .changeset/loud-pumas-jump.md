---
"hardhat": patch
---

Fixed `--coverage` runs failing with `RangeError: Invalid string length` when coverage data exceeds Node's `JSON.stringify` string-length ceiling.