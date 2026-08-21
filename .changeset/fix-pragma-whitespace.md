---
"hardhat": patch
---

Normalize whitespace in Solidity version pragmas before semver matching to fix HHE909 for files with spaces inside version literals (e.g. `pragma solidity ^ 0.8 .0`).
