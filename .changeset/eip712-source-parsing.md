---
"@nomicfoundation/hardhat-errors": patch
"hardhat": minor
---

The EIP-712 cheatcodes now collect every struct that a test source reaches, through its dependencies as well. They no longer see every struct in the project, so there is no longer a list of structs to maintain.

The `test.solidity.eip712Types` option keeps only `exclude`, which leaves the files it matches out of the collection. It is only needed to settle a clash between two reachable structs of the same name.

Its globs are now matched against each file's path relative to the project root, with forward slashes and no leading `./` or `/`. A dependency is therefore addressed as `node_modules/<package>/...` instead of the solc input name `npm/<package>@<version>/...`.

Collecting the struct definitions and the inline test configuration requires parsing the test sources, which needs Solidity 0.8.0 or newer. When a selected test suite was compiled with an older version, both features are disabled for the whole run. A warning names the suites that caused it.

BREAKING CHANGE: `test.solidity.eip712Types.include` is removed and now fails configuration validation. Remove it, and use `exclude` when two reachable structs share a name.
