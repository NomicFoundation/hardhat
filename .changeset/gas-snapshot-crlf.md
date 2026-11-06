---
"hardhat": patch
---

Fixed `--snapshot-check` failing with `HHE803` when `.gas-snapshot` has CRLF line endings, as in Windows checkouts.
