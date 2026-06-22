---
# docs: https://github.com/NomicFoundation/hardhat-website/pull/278
"hardhat": patch
---

Make `hardhat test solidity --snapshot-check` read-only. It no longer rewrites or deletes `.gas-snapshot` or `snapshots/*.json` files, and instead reports differences. The command now fails when a stored gas value differs from the current one, or when no baseline exists, with a hint to run `--snapshot`.
