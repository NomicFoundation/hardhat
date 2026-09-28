---
"@nomicfoundation/hardhat-errors": patch
"hardhat": minor
---

The EIP-712 cheatcodes now resolve struct names from the source of the test contract itself and the files it imports. They no longer see every struct in the project.

The `eip712Types` Solidity test option no longer has any effect and warns when it is set, so you can remove it. Listing the structs to collect is no longer necessary, as the test's own imports decide what it can name.

Collecting the struct definitions and the inline test configuration requires parsing the test sources, which needs Solidity 0.8.0 or newer. When a selected test suite was compiled with an older version, both features are disabled for the whole run. A warning names the suites that caused it.
