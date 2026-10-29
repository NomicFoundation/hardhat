---
"hardhat": patch
---

Fixed `--snapshot-check` rejecting a `.gas-snapshot` file with CRLF line endings, as git on Windows can check it out, with `HHE803: Invalid format in snapshot file`.
