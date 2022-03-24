# hardhat

## 2.9.2

### Patch Changes

- 8fda4036: - Fix a bug that would override mocha grep options within the test task
- dd0dc168: Fix a bug in Hardhat Network that prevented the forking functionality from working (#2528)
- 6ff1cb03: Fixed bug (#2352) preventing the disabling of node task logging via hardhat.config.

## 2.9.1

### Patch Changes

- 69a6434e: Fix a bug that made Hardhat Network hang when connecting MetaMask (#2380)

## 2.9.0

### Minor Changes

- bf017963: Add a new RPC method, `hardhat_mine`, which supports the mining of multiple blocks in a single call (#1112)
- 345ebab7: The `test` task now supports a `--parallel` flag to run tests in parallel. There are also two other new flags: `--bail`, to stop the execution after the first test failure, and `--grep`, to filter which tests should be run.

  To support running tests in parallel, the version of `mocha` used by Hardhat was upgraded to its latest version. This should be a mostly backward-compatible change, but there could be some edge cases where this breaks existing tests.

### Patch Changes

- 04f4b3a4: Added support for BIP39 passphrases (thanks @zhuqicn!)
- dda96346: Solidity files are now compiled in parallel
- ce06e238: Preserve any existing user's README when initializing a project (#1942)
- caecc59b: The test task now works correctly when a test file starts with `./` (fixes #2220).
- 87c50af1: A warning is now shown when a node version greater than the current LTS is used.
- b18e043b: Improved the performance of requests to remote RPC nodes by the use of connection pooling.

## 2.8.4

### Patch Changes

- 5473906d: The sample projects now include an empty `.prettierc` to make IDEs auto-formatting work properly in some scenarios.
- 38ee6230: Replace deprecated eth-sig-util with @metamask/eth-sig-util
- 2425201c: Upgraded the version of `@nomiclabs/hardhat-etherscan` used by the sample projects (#2217)

## 2.8.3

### Patch Changes

- 9b1de8e0: Full rework of vyper plugin (#2082, #1364, #1338, #1335, #1258)
- e2eb07cc: Use 40s as the default value for mocha's timeout and for the localhost network's timeout (#1549).

## 2.8.2

### Patch Changes

- 2794fc00: Show a special error when project initialization fails on windows

## 2.8.1

### Patch Changes

- 6753b930: Show warning if user doesn't export or exports empty object from Hardhat config file (issue #1490)
- 0a5ab4f8: Fix running the `test` task multiple times in a script (issue #1720)

## 2.8.0

### Minor Changes

- 3f212c11: Allow configuration of hardfork activation history, for use with unusual/custom chains/network

### Patch Changes

- ff80e1db: A fix to remove ansi escape characters when logging from hardhat node to file (issue #467).

## 2.7.1

### Patch Changes

- d867073c: Support `arrowGlacier` hardfork
- 10211542: Fix a bug that prevented Hardhat from working if the compilers list was partially downloaded (issue #1466)

## 2.7.0

### Minor Changes

- 4d277c97: Add a FIFO mode to Hardhat Network's mempool (Thanks @ngotchac!)
- d2d34737: Make the coinbase address customizable via a config field and a new RPC method.

### Patch Changes

- 99c17f43: Bump uuid package to remove a deprecation warning (thanks @yhuard!)
- 8076c43b: Fixed how the cummulative gas is computed for receipts and added a missing field (Thanks @ngotchac!)
- e6362902: Display similar artifact names in error output if given name is not found (#201)
- e087bd0b: Improve validation of private keys in the Hardhat config
- aa1a0080: Fix an issue with new versions of Node.js that prevented clients from connecting to Hardhat's node using 127.0.0.1
- 846f7856: Enable user configurable tsconfig path
- 89529afc: Print warning when user tries to use solc remapping (#1877)

## 2.6.8

### Patch Changes

- f35f3548: Add support for the `personal_sign RPC method to Hardhat Network.
- 692b9130: Throw an error for solc versions older than 0.4.11
- 4df2df4d: Add a new `hardhat_getAutomine` JSON-RPC method to Hardhat Network that returns `true` if automining is enabled and `false` if it's not.
- 91edb2aa: Add support for Solidity 0.8.7.
- c501e1ec: Added support for Solidity 0.8.6.
- 4ccd1f72: Enable solc's metadata by default (Thanks @chriseth!)
- 4f102576: Support Solidity 0.8.9
- 12158a06: Added support for Solidity 0.8.8
- 4c7fe24e: Add support for Solidity 0.8.5.
- d00a1a71: Print a warning in the node task if the default accounts are used.

## 2.6.7

### Patch Changes

- c2ab8198: Upgrade @solidity-parser/parser (fixes #1801)
- 3032c374: Fix `eth_feeHistory` computation (issue #1848)

## 2.6.6

### Patch Changes

- 09415141: Work around an issue that broke Hardhat Network when contracts were compiled in the middle of its execution

## 2.6.5

### Patch Changes

- e29e14c7: Add Advanced Sample Project that uses TypeScript.
- a00345ca: Small improvements to the advanced sample project.

## 2.6.4

### Patch Changes

- b62ddf32: Fix a bug in Hardhat Network's solidity source maps processing. Thanks @paulberg!

## 2.6.3

### Patch Changes

- c4b32d7d: Fix a bug that prevented Hardhat Network's tracing engine from working if an interface was used as a mapping key (Thanks @k06a!)

## 2.6.2

### Patch Changes

- abc380ce: Fix issue with networks that support `eth_feeHistory` but that don't support EIP-1559 (#1828).
