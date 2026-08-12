---
# docs: https://github.com/NomicFoundation/hardhat-website/pull/291
"@nomicfoundation/hardhat-errors": patch
"hardhat": minor
---

Added a `--tolerance` option to `--snapshot-check` in Solidity tests, allowing snapshot values to drift by a given percentage before the check fails.
