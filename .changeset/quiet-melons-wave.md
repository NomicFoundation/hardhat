---
"hardhat": patch
---

Make `hardhat test solidity --snapshot-check` read-only so it no longer rewrites or deletes `.gas-snapshot` or `snapshots/*.json` files; it now reports differences, fails when a stored gas value changed, and suggests `--snapshot` when there's no baseline.
