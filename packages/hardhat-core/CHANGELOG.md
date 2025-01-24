# hardhat

## 2.22.18

### Patch Changes

- 25f45b0: Improve solidity stack traces performance by getting them from the EDR response
- 0e5c8d7: Restored the message linking to the 2024 solidity survey

## 2.22.17

### Patch Changes

- c6efe1d: fix: don't panic when a precompile errors
- 56d127b: Make totalDifficulty field optional, as spec has changed.
- e47b495: Added support for solc versions 0.8.28
- 9ad82f5: Added an optional `--output` param to the flatten task

## 2.22.16

### Patch Changes

- fcece65: Replaced `chalk` with `picocolors`, `glob` with `tinyglob`, and upgraded `find-up`

## 2.22.15

### Patch Changes

- ede1cde: Fixed custom HTTP headers for forked configurations

## 2.22.14

### Patch Changes

- 09ead48: Fixed error when remote nodes are not returning total difficulty from the eth.getBlock RPC API, by adding fallback value

## 2.22.13

### Patch Changes

- bf92f4c: Fixed more bugs in the newly ported Solidity tracing logic
- 3df95d3: Remove support for `console.log` selectors that wrongly use "(u)int" type aliases in the selector calculation
- 4c1bcfc: Fixed minor bugs in the newly ported Solidity tracing logic

## 2.22.12

### Patch Changes

- 5fb3095: Adapted Hardhat to trace Solidity logic on EDR. This resulted in a 10% performance improvement for most workloads.

## 2.22.11

### Patch Changes

- 601d543: Fixed a problem with provider events when `provider.init` was explicitly called before the first request.
- 224159e: Added support for solc versions 0.8.25, 0.8.26, and 0.8.27
- b43ed78: Added link to Ignition docs in sample projects
- 07e0a9c: Hardhat node can now handle large response objects by streaming them.
- 12d1980: Upgrade chokidar

## 2.22.10

### Patch Changes

- 409e99f: Fixed `debug` logs in Hardhat Network initialization process.
- 46cd7a1: Removed the experimentalAddHardhatNetworkMessageTraceHook API

## 2.22.9

### Patch Changes

- 6771f00: Do not send `http_setLedgerOutputEnabled` messages beyond the HTTP Provider to prevent unwanted warnings in the logs of the local hardhat node

## 2.22.8

### Patch Changes

- f5d5d15: Fixed an issue with `debug_traceTransaction` when large responses were generated
- 31d9d77: Upgraded EDR to v0.5.2

## 2.22.7

### Patch Changes

- f944cd5: Added an `enableRip7212` optional flag to the Hardhat Network config that enables [RIP-7212 (Precompile for secp256r1 Curve Support)](https://github.com/ethereum/RIPs/blob/master/RIPS/rip-7212.md).
- f6ddc92: Add `debug` logs to Hardhat Network initialization process.
- 6c943bb: Fix message for error HH206
- f944cd5: Bumped EDR to [v0.5.0](https://github.com/NomicFoundation/edr/releases/tag/%40nomicfoundation%2Fedr%400.5.0).

## 2.22.6

### Patch Changes

- cdf0160: Upgrade bundled solcjs
- 3c66da2: Add support for Node v22
- 9fadc22: Bump EDR to [v0.4.1](https://github.com/NomicFoundation/edr/releases/tag/%40nomicfoundation%2Fedr%400.4.1).
- 095faa4: Added hardfork histories for Optimim and Arbitrum chains

## 2.22.5

### Patch Changes

- f65dc7c: Improved the validation of network and forking URLs (thanks @kshyun28!)
- 5d46baa: Internal changes to allow `hardhat-tracer` to be re-enabled with Hardhat after the EDR upgrade
- 6e36f3f: Bump EDR to v0.4.0. This adds support for `eth_maxPriorityFeePerGas`, limited support for blob transactions, improves performance and fixes some bugs. Check out the [v0.4.0 EDR release](https://github.com/NomicFoundation/edr/releases/tag/%40nomicfoundation%2Fedr%400.4.0) and [v0.3.8 EDR release](https://github.com/NomicFoundation/edr/releases/tag/%40nomicfoundation%2Fedr%400.3.8) for more details.

## 2.22.4

### Patch Changes

- 22bcbf5: Added BigInt task argument type
- 2c533f0: Bumped EDR dependency to 0.3.7
- 3203639: Fixed an issue in the solidity source map decoding module
- 5d7a604: Fixed an issue with solc version selection
- 3c6de8f: Now solcjs is run in a subprocess, which leads to better error reporting and allows it to run multiple compilation jobs at the same time
- 6447e80: Improved performance by reducing back-and-forth with EDR when it's not necessary

## 2.22.3

### Patch Changes

- 6466e3a: A proper error is now thrown when requiring EDR fails
- ae62841: Upgrade EDR to version [0.3.5](https://github.com/NomicFoundation/hardhat/blob/3b36d76a88915de6bb5efd0eb110cc1782c461ca/crates/edr_napi/CHANGELOG.md#035)
- 679d8a5: Report [HH18](https://hardhat.org/hardhat-runner/docs/errors#HH18) to Sentry.

## 2.22.2

### Patch Changes

- 7876104: Initialize the Hardhat Runtime Environment before passing the command line arguments.

## 2.22.1

### Patch Changes

- 92d140f: Include Hardhat Ignition in the toolboxes of the starter projects
- cfec932: Upgraded hardhat-toolbox-viem to support viem@2 in the viem sample project

## 2.22.0

### Minor Changes

- bcce371: Set cancun as the default hardfork in Hardhat network

## 2.21.0

### Minor Changes

- 837350e: Dropped support for node v16
- 3df5d29: Refactored Hardhat Network to use EDR instead of ethereumjs

### Patch Changes

- 6b6f447: Fixes a bug in Hardhat where Post-Cancun genesis blocks did not use the mandated 0x0 parent beacon block root (https://eips.ethereum.org/EIPS/eip-4788)

## 2.20.1

### Patch Changes

- b519239: Fixed a bug when `hardhat_setStorageAt` was used in untouched addresses

## 2.20.0

### Minor Changes

- 6ff0b20: Add support for the Cancun hardfork

### Patch Changes

- 4250635: Added support for solc 0.8.24

## 2.19.5

### Patch Changes

- 125cbad3d: Added a notification when a new Hardhat version is available
- ffb301f14: Improved loading performance
- 1c6373a5b: Fixed a bug during project initialization when using yarn or pnpm
- 15a0d2e6c: Fixed a race condition that occurred when multiple Hardhat processes ran a compilation at the same time.
- 8f677ea9f: Added a fix to prevent submitting transactions with 0 priority fee (thanks @itsdevbear!)

## 2.19.4

### Patch Changes

- 7aea77e49: Report telemetry consent response to Google Analytics

## 2.19.3

### Patch Changes

- 3f282db50: Added support for solc 0.8.23
- fa2f0fba7: Added a temporary message about the 2023 Solidtiy Developer Survey

## 2.19.2

### Patch Changes

- b475fc49c: Modified the artifacts cleanup logic to avoid removing a `package.json` file under the artifacts directory
- c3aad2c55: Added support for scopes in hh autocomplete.
- 4bc6a2726: Added experimental support for using ESM modules with TypeScript

## 2.19.1

### Patch Changes

- 23665f399: Upgraded toolboxes versions used in project initialization
- 106235cb0: Fixed an issue in low-traffic chains that resulted in txs using a `maxPriorityFeePerGas` of 0
- c52a5d653: Added logic to avoid downloading the same compiler version multiple times
- b46ccf46d: Updated the `.gitignore` files generated during project initialization to use relative paths

## 2.19.0

### Minor Changes

- 27f3d6355: Added support for configuration variables management

### Patch Changes

- f2f67df3c: Added support for solc 0.8.22

## 2.18.3

### Patch Changes

- bddfcff8d: Send GA hits for `ignition deploy` tasks

## 2.18.2

### Patch Changes

- abca5abaf: Fixed the compiler download, which broke with the latest version of undici

## 2.18.1

### Patch Changes

- b77b665fd: Added a viem option to the project initialization
- 03edea678: Updated the compilation logs to include the targeted EVM versions.

## 2.18.0

### Minor Changes

- 9412419b8: Added support for scoped tasks

### Patch Changes

- e95e954b4: Report issues from `@nomicfoundation` npm scope

## 2.17.4

### Patch Changes

- 11e58f67c: Added an explicit command `hardhat init` to initialize projects, and deprecated project initialization with just `hardhat`.
- 8388720ea: Added support for the RPC method debug_traceCall.

## 2.17.3

### Patch Changes

- c03c710ad: Set the default evmVersion to paris for solc versions that are greater than or equal to 0.8.20.

## 2.17.2

### Patch Changes

- ee9d2ff06: Added support for state overrides in the RPC Method eth_call
- c00c689ae: Removed the superfluous zeros that were returned in the `memory` property when calling the `debug_traceTransaction` method.
- 7084d32e2: Deprecated the `TASK_COMPILE_TRANSFORM_IMPORT_NAME` subtask, added a new `TASK_COMPILE_GET_REMAPPINGS` subtask, and added support for remappings in the resolver.
- fa41db82b: Added an `enableTransientStorage` option to enable EIP-1153 opcodes
- 8ae64478d: Fixed an issue where artifactExists would throw an error for missing artifacts.
- 45f49ae20: Improved error message displayed when importing a directory instead of a file.
- 3ea6c5237: Fixed a problem with receipts of remote transactions returning the wrong tx type when fetched through a fork.

## 2.17.1

### Patch Changes

- 8f50ab814: Removed the `abort-controller` dependency as it's not longer needed. Thanks @orlandoortegajr!
- 951906da2: Improved the flatten task to handle SPDX licenses and pragma directives more effectively.
- e4424e3ad: Added support for solc 0.8.21
- fff90bb6e: `console.log` now works in `pure` functions. Thanks @0age for coming up with this technique!
- 9fe89ef96: Fixed a bug caused by nodes returning 429 responses without a `Retry-After` header (thanks @kowalski!)
- 6390230b7: Added logic to throw an error when the debug_traceTransaction method is called with a tracer parameter that is not supported.

## 2.17.0

### Minor Changes

- 01f1e3f7e: Dropped support for node v14 and added support for node v20

### Patch Changes

- 092b77140: Added logic to use the latest block as the forking block if the difference between the latest block and the max reorganization block is negative. This decision is based on the assumption that if the max reorganization block is greater than the latest block then there is a high probability that the fork is occurring on a devnet.
- 2b0ac92a3: Fixed an issue in the compilation pipeline where a valid build-info file was mistakenly deleted
- c0aa10c2d: Added support for solc 0.8.19 and 0.8.20

## 2.16.1

### Patch Changes

- 68cf2a273: Fixed an issue related to compiler downloads in node v18.16.x

## 2.16.0

### Minor Changes

- 8c5f3f3bc: Added support for extending the network provider

### Patch Changes

- 128b0a0de: Added a HARDHAT_DISABLE_TELEMETRY_PROMPT environment variable that can be set to `true` to prevent Hardhat from showing the telemetry consent prompt.
- 27a5cda59: Migrated Google Universal Analytics to Google Analytics 4
- c115dfd21: `console.sol` is now memory-safe (thanks @ZumZoom!)
- c61fd8ac0: Added optional params to some compilation subtasks to make them more flexible (thanks @adjisb!)

## 2.15.0

### Minor Changes

- 99995d53b: The sample projects now use the new version of the Toolbox

## 2.14.1

### Patch Changes

- e99498638: Added block numbers for all mainnet hardforks

## 2.14.0

### Minor Changes

- d69020f72: Set Shanghai as the default hardfork

## 2.13.1

### Patch Changes

- 5d4d1edba: Fixed a problem when importing scoped packages in a Yarn Berry monorepo that uses PnP (thanks @zouguangxian!)
- cdd9aa578: Added support for the shanghai hardfork

## 2.13.0

### Minor Changes

- 83ef755f3: Hardhat's task runner now allows you to override the arguments passed to subtasks.
- 50779cd10: Added support for writing scripts and tests as ES modules.

  To learn how to start using ESM with Hardhat read [this guide](https://hardhat.org/hardhat-runner/docs/advanced/using-esm).

### Patch Changes

- f55a3a769: Reduce the amount of ETH sent to the Lock contract in the sample project's deploy script (Thanks @mutedSpectre!)
- 929b26849: The `resolveJsonModule` compiler option is now enabled by default in the sample tsconfig (thanks @mlshv!)
- 071e6bc89: Stop colorizing the entire message when an error is printed
- 0fa7ac548: Make Hardhat more tolerant to unsupported Node.js versions
- 7a5bc5512: Send less ETH and lock it for less time on sample deployment scripts.
- 7ceb5f90d: Added basic support for solc `viaIR` setting
- e6f07b4b6: Fixed an issue with a warning showing the same solc version multiple times (thanks @shark0der!)
- 6e51edf4d: Added support for Solidity 0.8.18 (thanks @taxio!)
- b9c34f36f: Fix an error that could happen when a download failed.
- 1c833bf04: Propagate HttpProviderError exception messages.

## 2.12.7

### Patch Changes

- e443b3667: Added an option in Hardhat Network to allow mining blocks with the same timestamp
- c23a1cac4: Added support for the `http_proxy` environment variable. When this variable is set, Hardhat will send its requests through the given proxy for things like JSON-RPC requests, mainnet forking and downloading compilers.

  We also removed support for the `HTTP_PROXY` and `HTTPS_PROXY` environment variables, since `http_proxy` is the most commonly used environment variable for this kind of thing. Those variables could only be used for downloading compilers.

  Finally, we also added support for `no_proxy`, which accepts a comma separated list of hosts or `"*"`. Any host included in this list will not be proxied.

  Note that requests to `"localhost"` or `"127.0.0.1"` are never proxied.

- 69546655e: Added support for sending batch requests through WebSocket to the Hardhat node (thanks @tenbits!)
- 6bf1673bb: Added a config validation for the number of optimizer runs used (thanks @konarshankar07!)

## 2.12.6

### Patch Changes

- 7e013fa19: Upgrade undici
- 025aa3660: Added support for pnpm during project creation (thanks @Hopsken!)
- 3798f0d72: Added a `version` field to the HRE
- c228ef56c: Fixed problem with impersonated-sender transactions sometimes resulting in duplicate transaction hashes (#1963)
- 7ca111982: Added a minor clarification to the `flatten` task help.
- 10a928c4c: Upgraded mocha and @types/mocha dependencies in Hardhat and Hardhat Toolbox
- a200a667b: Removed the message linking to the 2022 solidity survey
- 7adb62b2a: Added a new subtask to the compile task to support the `hardhat-foundry` plugin

## 2.12.5

### Patch Changes

- 051bedf01: Added an experimental environment variable flag to disable the local installation check
- 3fcdd3bb2: The selector of unrecognized custom errors is now shown as part of the error message (thanks @vivianjeng!)
- aa721398e: Fixed a bug that was causing the flatten task to produce non-deterministic results
- 5dc9b7c99: Fixed a bug when `gasPrice` was set to `"auto"`, which is the default configuration when connecting to a JSON-RPC network. This bug was preventing the results from `eth_feeHistory` from being used when they should.
- 23a594a59: The full return data of unrecognized custom errors is now shown in error messages
- 7e81377fc: Accept extra headers in the internal download module

## 2.12.4

### Patch Changes

- 7154371e3: Fixed an issue that caused compilation with solcjs to not work when Hardhat is bundled
- 2fc9a2cb8: Show a message with a link to the Solidity Developer Survey

## 2.12.3

### Patch Changes

- 13433f176: Fixed an edge case where Hardhat would hang if `debug_traceTransaction` was used with an OOG transaction sent to a precompile.
- c9809e182: Trim leading and trailing spaces in mnemonics.
- a1d43109a: Pending blocks now include the `bloom` field.
- 818107821: Added a new `hardhat_metadata` RPC method
- 937d15e51: A better error is show if a Solidity file makes an import throug its own package name.
- 4cf9a6d58: Added a `getBuildInfoSync` function to the `hre.artifacts` object (thanks @emretepedev!)

## 2.12.2

### Patch Changes

- f6c74bc31: Fixed an issue that was causing build-info file names to not be deterministic.
- 2022bed0d: Fixed an issue when forking networks like Arbitrum Nitro that use non-standard transaction types (#2995, #3194).

## 2.12.1

### Patch Changes

- 145b12c7d: Fixed a problem that was preventing Hardhat from being used in Alpine Linux.

## 2.12.0

### Minor Changes

- aebec509e: Use `"merge"` hardfork setting by default in Hardhat Network

### Patch Changes

- 3db5334b9: Fix compiler downloader
- 6d2edac4e: Upgrade `solidity-analyzer` and handle NPM's issue #4828.

## 2.11.2

### Patch Changes

- 1cfee28db: Make `eth_getStorageAt` more permissive
- 1375e1cc3: When forking, the disk cache is now used for any network
- 8aec687e9: Support Solidity 0.8.17
- 7e6a69561: Fixed a breaking change in the configuration type that was accidentally introduced in Hardhat 2.9.8.
- f4fd6a27e: Upgraded dependencies in sample projects
- 0d236ba73: Fix an error in the README files generated by the sample projects.
- c4c1d2fe0: Always show stack traces on CI servers
- 191c8ebbe: Improved the way we detect errors related to deploying contracts with a code that is too large.

## 2.11.1

### Patch Changes

- f4101d1be: Fixed a problem when the wasm version of the solidity compiler was downloaded.
- 1a1fa4cd5: Fix an error when forking from non-POW chains

## 2.11.0

### Minor Changes

- f3ba15ca8: - Added support for the merge
  - Added a new `hardhat_setPrevRandao` RPC method
  - Optimized the compilation task
  - Typechecking is now opt-in instead of opt-out
  - Added a new `--flamegraph` flag for performance profiling
  - Artifact paths are now cached
- d93ab3198: Added support for the merge.

## 2.10.2

### Patch Changes

- f799e7e41: - Fixed a bug that was causing `console.log()` to print `undefined` instead of an empty line (issue #2721)
  - Made `console.log` ABI-compliant (issue #2666)
- 36ca875dc: The selector is now shown in the "Unrecognized custom error" message
- 3e3fe7bf0: Added support for Solidity versions up through 0.8.16

## 2.10.1

### Patch Changes

- 3d571e40b: Better Solidity errors propagation

## 2.10.0

### Minor Changes

- 5b29b0e0b: Update sample projects to use the Hardhat Toolbox

### Patch Changes

- 3dcc802b3: Add support for Node 18
- 3dcc802b3: Upgrade Mocha to 10.x
- 3dcc802b3: Upgrade ethereum-cryptography to 1.x
- f5afa18d3: Removed a workaround to past Ganache's gas estimation problems.
- 3dcc802b3: Drop support for Node 12

## 2.9.9

### Patch Changes

- ce6136b2a: Fix incorrect peerDependency
- 3fd3756e6: Specify ts-node and typescript as optional peerDependencies

## 2.9.8

### Patch Changes

- 5bd775a8b: Added support for HTTP headers in the forking config (thanks @TimDaub!)
- 3770a5bbc: Expose a missing method in the Artifacts interface

## 2.9.7

### Patch Changes

- 73beb279b: Fixed `block.chainid` returning 0 in view functions

## 2.9.6

### Patch Changes

- fde08e0c: Updates `node` task to terminate when the server closes.
- 736e850a: Fixed an issue that was preventing compilation from working on Windows (#2712)

## 2.9.5

### Patch Changes

- e42ef24d: Fixed a publish problem in 2.9.4
- 81e28117: Make `eth_getStorageAt` spec-compliant. This means that the storage slot argument **must** have a length of 32 bytes (a hex-encoded string of length 66).

## 2.9.4

### Patch Changes

- 1de87072: Fix passing options and depth when inspecting a lazyObject or lazyFunction
- 7403ec1d: Stop publishing tsconfig.json files
- b9f997cb: Upgraded ethereumjs dependencies (thanks @LogvinovLeon!).
- 58aa161a: Expand the `data` object returned by the JSON-RPC response when a transaction or call reverts. Now it also includes the `message` and `data` fields. The `message` is the same message that is part of the response, and it's included to make things work better with ethers.js. The `data` field includes the return data of the transaction. These fields are included in the responses of the `eth_sendTransaction`, `eth_sendRawTransaction`, `eth_call` and `eth_estimateGas` methods when they revert.
- 78876d64: Fix a bug preventing to run the solcjs compiler.
- 1929e177: Fix a bug when formatting optional params in the help messages.
- 4238a921: Fixed a problem with `hardhat_mine` when used with `solidity-coverage`.
- 32cc90bf: Allow --version flag to be used when not in a Hardhat project directory
- b5273ce1: - Fixed a potential OOM error during parallel compilation
  - Added a `--concurrency` param to the compile task
- 97eb5820: The `CustomError` class is now exported in `hardhat/common`

## 2.9.3

### Patch Changes

- 74a12d7b: Fixed a bug preventing loggingEnabled from working properly and exposed userConfig field in HRE

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
