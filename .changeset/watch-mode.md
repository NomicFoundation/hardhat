---
# docs: https://github.com/NomicFoundation/hardhat-website/pull/314
"@nomicfoundation/hardhat-errors": patch
"hardhat": minor
---

Added watch mode to `hardhat build`, `hardhat test`, and `hardhat test solidity` ([#891](https://github.com/NomicFoundation/hardhat/issues/891)). Add `--watch` or `-w` to run the command again each time a source file, a test, or the config changes. When a single test file changes, only that file runs. Use `--run-all` to run every test on each change, `--no-restart` to let a run finish before starting the next one, and `--watch-delay` to set how long to wait for more changes, in milliseconds.
