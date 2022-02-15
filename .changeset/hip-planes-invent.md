---
"hardhat": minor
---

The `test` task now supports a `--parallel` flag to run tests in parallel. There are also two other new flags: `--bail`, to stop the execution after the first test failure, and `--grep`, to filter which tests should be run.

To support running tests in parallel, the version of `mocha` used by Hardhat was upgraded to its latest version. This should be a mostly backward-compatible change, but there could be some edge cases where this breaks existing tests.
