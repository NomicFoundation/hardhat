---
"@nomiclabs/hardhat-solhint": major
---

Ensured the check task exists with exit code 1 when solhint raises any errors and updated solhint dependency to [v5.0.2](https://github.com/protofire/solhint/releases/tag/v5.0.2)

## ⚠️ Breaking Change ⚠️

This release introduces a breaking change. Previously, the check task would exit with exit code 0 even if solhint raised some errors. Starting with this version, the check task will exit with exit code 1 if any errors are raised and 0 otherwise.
