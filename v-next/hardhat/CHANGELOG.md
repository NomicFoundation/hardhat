# hardhat

## 3.0.0-next.30

### Patch Changes

- 5fbea0d: Modified to use type-safe lazy imports for hooks, task actions, and plugin dependencies ([7117](https://github.com/NomicFoundation/hardhat/issues/7117)).

## 3.0.0-next.29

### Patch Changes

- 65e26fd: Update comments and readme on template projects ([#7149](https://github.com/NomicFoundation/hardhat/issues/7149))
- 813237a: Update how production profiles are derived from the default config ([#7154](https://github.com/NomicFoundation/hardhat/pull/7154))
- 1a0b064: Improve the error message for syntax errors found in the Hardhat config file ([#7056](https://github.com/NomicFoundation/hardhat/issues/7056))
- bf2d771: Added `isolated` config option to the build profile configuration (https://github.com/NomicFoundation/hardhat/issues/7125) and remove the `--isolated` flag.

## 3.0.0-next.28

### Patch Changes

- 76674de: Print error's `cause` when showing stack traces
- a657c61: Fix an error descriptor
- 8bd46cb: Stop solidity tests being recompiled unnecessarily ([#7116](https://github.com/NomicFoundation/hardhat/issues/7116))
- e861a55: Don't anonymize node's internals in the error reporter
- 78bdf81: Add preferWasm flag to config. Default to wasm on production profile. Support linux-aarch64 native compiler ([#5993](https://github.com/NomicFoundation/hardhat/issues/5993))
- c2fd9aa: Send selected project type to GA

## 3.0.0-next.27

### Patch Changes

- 1e5d699: Fix example tests hanging when running on fork mode ([#6967](https://github.com/NomicFoundation/hardhat/pull/7120))
- a958d46: Change the config test path property from `nodeTest` to `nodejs` ([#7100](https://github.com/NomicFoundation/hardhat/pull/7100))
- ef89be2: Rename `optimism` chain type to `op` ([#7085](https://github.com/NomicFoundation/hardhat/issues/7085))
- 2da3a06: Group `mocha` and `solidityTest` config under `test` property ([#7101](https://github.com/NomicFoundation/hardhat/pull/7101))
- 5fbea0d: Rename `edr` label to `edr-simulated` in network config ([#7051](https://github.com/NomicFoundation/hardhat/issues/7051))
- 4c160a8: Display **GLOBAL OPTIONS** in help messages of all tasks that support them ([#7114](https://github.com/NomicFoundation/hardhat/issues/7114))
- e98ded3: Upgraded EDR dependency to @nomicfoundation/edr v0.12.0-next.4, which changes the file system permission config interface for Solidity tests to mitigate EVM sandbox escape through cheatcodes.
- b142813: Added Hardhat v2 template support to `hardhat --init` ([#7035](https://github.com/NomicFoundation/hardhat/issues/7035))
- 1266aaf: Upgraded EDR dependency to @nomicfoundation/edr v0.12.0-next.2
- eea70ff: Make `forge-std` work with and without `src/`
- a657c61: General improvement of error messages.
- 1266aaf: Added the addresses of created contracts in call traces
- c2f7136: Removed deprecated JSON-RPC methods: `eth_mining`, `net_listening`, `net_peerCount`, `hardhat_addCompilationResult`, `hardhat_intervalMine`, and `hardhat_reset`.
- 09d4ccb: Add a development keystore ([#7003](https://github.com/NomicFoundation/hardhat/issues/7003))
- d71f90e: Add migration task for HHv2 Ignition deployments ([#6538](https://github.com/NomicFoundation/hardhat/issues/6538))
- 28887b9: Change the type of the `npmPackage` plugin property ([7058](https://github.com/NomicFoundation/hardhat/issues/7058))

## 3.0.0-next.26

### Patch Changes

- ed3ba1a: Update build info ids ([#7049](https://github.com/NomicFoundation/hardhat/issues/7049))
- 9875011: Fixed hardhat-viem support for L2 actions when using the optimism chain type
- 00be01a: Improve chain detection to enable multicall and ENS actions on forked networks ([#7063](https://github.com/NomicFoundation/hardhat/pull/7063))
- 2b62b40: Add code coverage for Solidity Test with the `--coverage` flag, i.e. `npx hardhat test solidity --coverage` ([#7019](https://github.com/NomicFoundation/hardhat/pull/7019))
- 6bf8eb1: Simplify solidity test config ([#7059](https://github.com/NomicFoundation/hardhat/issues/7059))
- c408306: Support predicates on viem-assertions ([#7038](https://github.com/NomicFoundation/hardhat/issues/7038))
- dd36123: Improved solidity tests output with a mocha/jest-inspired reporter ([#6909](https://github.com/NomicFoundation/hardhat/issues/6909))

## 3.0.0-next.25

### Patch Changes

- 9fb4264: Add `--verify` option for Ignition deploy task to verify all contracts of a deployment on Etherscan ([#6817](https://github.com/NomicFoundation/hardhat/issues/6817))
- 37e712b: Remove `hardhat_reset` ([#6110](https://github.com/NomicFoundation/hardhat/issues/6110))
- edccb60: Report stack trace generation errors to Sentry ([#7010](https://github.com/NomicFoundation/hardhat/issues/7010))
- 4b8d464: Fix rule for determining whether local files are written for an Ignition deployment ([#6999](https://github.com/NomicFoundation/hardhat/issues/6999))
- 72cfaff: Remove `enableRip7212` from EDR network configuration ([#6182](https://github.com/NomicFoundation/hardhat/issues/6182))
- 72cfaff: Remove `enableTransientStorage` from EDR network configuration ([#6182](https://github.com/NomicFoundation/hardhat/issues/6182))

## 3.0.0-next.24

### Patch Changes

- 595c970: Rename `dependenciesToCompile` to `npmFilesToBuild` in Hardhat config ([#6877](https://github.com/NomicFoundation/hardhat/issues/6877))
- 595c970: Add `build` task that replaces `compile`, but keep the `compile` task as an alias to `build` ([#6877](https://github.com/NomicFoundation/hardhat/issues/6877))
- e3e9757: Added call traces support for solidity tests; call traces can be enabled via the `-vvvv` verbosity level flag ([#6830](https://github.com/NomicFoundation/hardhat/issues/6830))
- dbd9368: Allow Ignition reconciliation of changed bytecode when the contract has been successfully deployed ([#7006](https://github.com/NomicFoundation/hardhat/pull/7006))
- ab67a7d: Support verifying contracts on all enabled providers from the main verify task ([#7007](https://github.com/NomicFoundation/hardhat/issues/7007))
- 3fe7683: Fixed global flag option parsing ([#7028](https://github.com/NomicFoundation/hardhat/issues/7028))
- cbbe240: Speed up re-compilation with better caching ([#6987](https://github.com/NomicFoundation/hardhat/pull/6987))

## 3.0.0-next.23

### Patch Changes

- b3eef2f: Fix `--network` passing as a command line option ([#7022](https://github.com/NomicFoundation/hardhat/pull/7022))

## 3.0.0-next.22

### Patch Changes

- bfb708c: Added support for short option names ([#6941](https://github.com/NomicFoundation/hardhat/pull/6941))
- a17a837: Allowed requesting help via the -h flag ([#6963](https://github.com/NomicFoundation/hardhat/pull/6963))
- 41f6295: Remove the `defaultNetwork` config option and introduce a network called `default` ([#6875](https://github.com/NomicFoundation/hardhat/issues/6875))
- c39d791: Use input source names in the link references, fixing a bug in the solidity test runner ([#7016](https://github.com/NomicFoundation/hardhat/pull/7016))
- 5451ae6: Fix node crash when sending a tx with insufficient funds ([#6929](https://github.com/NomicFoundation/hardhat/issues/6929))
- ab67a7d: Enable verification providers by default and throw if Etherscan apiKey is empty ([#6937](https://github.com/NomicFoundation/hardhat/pull/6937))

## 3.0.0-next.21

### Patch Changes

- 136a7fd: Use input fqn in etherscan verification
- bb433d2: Enable multichain testing support in Solidity test runner
- 6afa1ac: Change the return tupe of `provider.request` from `unknown` to `any`
- 9654d75: Combine and upgrade EDR dependencies to @ignored/edr-optimism v0.13.0-alpha.5 ([#6912](https://github.com/NomicFoundation/hardhat/pull/6912))
- bc9c472: Add task to change password in `hardhat-keystore`
- 5fbea0d: Fixed misspelled words in all the packages

## 3.0.0-next.20

### Patch Changes

- 59daf94: Fix how solidity tests are run and displayed

## 3.0.0-next.19

### Patch Changes

- fe42147: Revamp the dependency resolution system: adding support for `remappings.txt` files, dropping support for `remappings` from the config, and changing how remappings into npm packages are written.
- ab67a7d: Add support for verifying contracts in Blockscout to hardhat-verify.

## 3.0.0-next.18

### Patch Changes

- 5607511: Allow js/ts test runners to run test files outside their configured paths ([#6904](https://github.com/NomicFoundation/hardhat/issues/6904))
- 6570ea3: Update the pre-release version number of the viem toolbox inline with the latest full release

## 3.0.0-next.17

### Patch Changes

- 5badb19: Rename 'node' task to 'nodejs' for node-test-runner ([#6884](https://github.com/NomicFoundation/hardhat/issues/6884))
- 08304e0: Add a task to `hardhat-keystore` to display the path to the keystore file ([#6872](https://github.com/NomicFoundation/hardhat/issues/6872))
- ee5476f: Made lcov.info coverage report available under coverage directory in the root of the project ([#6891](https://github.com/NomicFoundation/hardhat/issues/6891))
- 997249a: Upgrade the version of TypeScript used in the sample projects ([#6869](https://github.com/NomicFoundation/hardhat/pull/6869))
- f6ea8d4: Added onClean hook to the built-in clean plugin ([#6891](https://github.com/NomicFoundation/hardhat/issues/6891))
- 017ad95: Fix a warning in Node 24 about passing args to `spawn` ([#6896](https://github.com/NomicFoundation/hardhat/issues/6896))

## 3.0.0-next.16

### Patch Changes

- 0a24fa5: Update ethers to v6.14.0 with Pectra support
- 674288c: Set prague as the default hardfork in Hardhat network
- 2796bb8: Accept `0x` as a valid value for `setCode`, thanks @arr00 ([#6844](https://github.com/NomicFoundation/hardhat/pull/6844))

## 3.0.0-next.15

### Patch Changes

- fd64634: Fixed a bug when sending ETH to the testing accounts in forked networks. Now testing accounts are automatically undelegated ([#6834](https://github.com/NomicFoundation/hardhat/issues/6834))
- a433be1: Reduced the number of installed package dependencies by swapping out `@sentry/node` for `@sentry/core` ([#6757](https://github.com/NomicFoundation/hardhat/pull/6757))
- 8c8c110: Fix a bug in `viem-assertions` to scan every event log, not just the first one ([#6787](https://github.com/NomicFoundation/hardhat/pull/6787))
- 1d891bd: Use file URLs instead of paths as arguments to `--import` when invoking the WASM solc compiler (https://github.com/nodejs/node/issues/58515)
- d844f6e: Add support for running under Node 24 ([#6792](https://github.com/NomicFoundation/hardhat/issues/6792))
- 6be01c4: Support async calls in `getAllFilesMatching` in `hardhat-utils`, thanks @ItsNickBarry ([#6789](https://github.com/NomicFoundation/hardhat/pull/6789))

## 3.0.0-next.14

### Patch Changes

- a1319ee: Add examples of our viem and ethers assertions in the sample projects
- dcd5f89: Fix node test reporter not stripping some diffs because of coloring (#6688)
- e582eaa: Removed unreliable context information from falsy expression error messages
- cf5c563: Add `hardhat-verify` to toolboxes ([#6756](https://github.com/NomicFoundation/hardhat/pull/6756))
- b7912e2: Rename the package `@nomicfoundation/hardhat-viem-matchers` to `@nomicfoundation/hardhat-viem-assertions` ([#6774](https://github.com/NomicFoundation/hardhat/pull/6774))
- 18dda34: Fix to set 0 retries on development networks for `hardhat-viem`, thanks @TateB ([#6784](https://github.com/NomicFoundation/hardhat/pull/6784))

## 3.0.0-next.13

### Patch Changes

- fa674d8: Removed `setDescription` from the empty task builder.
- 6aa223a: Improve the `package.json` that gets created by default on `--init`
- bfb708c: Support using format on config variables
- e386767: Upgraded deprecated deleteSnapshot, deleteSnapshots, revertTo, revertToAndDelete, and snapshot cheatcodes in favor of deleteStateSnapshot, deleteStateSnapshots, revertToState, revertToStateAndDelete, and snapshotState
- 869f8c7: Add support for `grep` in the Hardhat `test` task.
- 8c1e9cb: Fixed instrumentation for control flow statements
- 2107cbe: Message on usage of verbose foundry flag for solidity tests (#6444)

## 3.0.0-next.12

### Patch Changes

- b86a3a1: Add a new Hardhat plugin providing assertion testing helpers for `viem` ([#6574](https://github.com/NomicFoundation/hardhat/pull/6574))

## 3.0.0-next.11

### Patch Changes

- 54ba870: Distribute coverage.sol as a part of the hardhat package

## 3.0.0-next.10

### Patch Changes

- 6b84f1a: Implemented coverage data collection from the test node task
- 6b84f1a: Added the definitions for Hardhat coverage related errors
- a8dc331: Update Viem to latest version
- d485fd3: Implemented coverage markdown and lcov reporting
- 6b84f1a: Implemented source instrumentation for the coverage data collection
- d485fd3: Implemented coverage data collection from the test mocha task
- 6b84f1a: Implemented coverage plugin to enable coverage data collection from the test tasks

## 3.0.0-next.9

### Patch Changes

- 458cc89: Delegate from `npx hardhat test` to appropriate test runner when file test path provided ([#6616](https://github.com/NomicFoundation/hardhat/issues/6616))
- d460644: Add the ability to filter Solidity tests with `--grep` ([#6690](https://github.com/NomicFoundation/hardhat/pull/6690))
- 918df12: Fix an issue with abstract contracts' factories ([#6703](https://github.com/NomicFoundation/hardhat/pull/6703))
- ad1d08b: Fix to ignore top-level `.json` files in the `artifacts` folder, as those are never actual artifacts ([#6613](https://github.com/NomicFoundation/hardhat/issues/6613))
- 624ba10: Fixed unintended deduplication of accounts ([#6707](https://github.com/NomicFoundation/hardhat/issues/6707))

## 3.0.0-next.8

### Patch Changes

- 6c27bd3: Fix to the template project scripts to match the new signature of `network.connect(...)` ([#6691](https://github.com/NomicFoundation/hardhat/issues/6691))
- 11e4652: Dedupe and sort merged solc outputSelection ([#6678](https://github.com/NomicFoundation/hardhat/pull/6678))

## 3.0.0-next.7

### Patch Changes

- 4ce9fe9: Fix to allow undefined params in JSON RPC handler ([#6532](https://github.com/NomicFoundation/hardhat/issues/6532))
- 726fe76: Port transaction hash bug fix to v3 ([#6429](https://github.com/NomicFoundation/hardhat/pull/6429))
- 6103a9e: Fix to allow user's to configure their own solc output selection in Hardhat config ([#6551](https://github.com/NomicFoundation/hardhat/issues/6551))
- 51a6d55: Update `network.connect` to take a params object ([#6672](https://github.com/NomicFoundation/hardhat/issues/6672))
- 0119377: Default to production builds for ignition deploy ([#6313](https://github.com/NomicFoundation/hardhat/issues/6313))
- ce8493c: Improve the error message produced by hardhat node test reporter for failing regex match assertions ([#6658](https://github.com/NomicFoundation/hardhat/pull/6658))
- c934f8f: Support options using the equals sign (e.g. `--option=123`) at the Hardhat command line ([#6671](https://github.com/NomicFoundation/hardhat/issues/6671))
- bb48c11: Fix for `init` task where Hardhat project folder will be created if it does not exist ([#6545](https://github.com/NomicFoundation/hardhat/issues/6545))
- bd1bf8f: Allow undefined for default values in global options and other argument types ([#6596](https://github.com/NomicFoundation/hardhat/issues/6596)
- 9506fb4: Rename chains config in network config to chainDescriptors and add extra information including name and blocker explorer ([#6612](https://github.com/NomicFoundation/hardhat/issues/6612))

## 3.0.0-next.6

### Patch Changes

- 49b0ff8: Relax validations for transaction signing introduced in the previous version by disabling strict mode in `Transaction.prepare` ([#6644](https://github.com/NomicFoundation/hardhat/pull/6644))
- 8896353: Replace "Contract reverted without a reason string" message with a more detailed failure reason in solidity tests ([#6647](https://github.com/NomicFoundation/hardhat/issues/6647))
- ca95b8f: Fix supporting different solc versions for libs and contracts in linker
- ca95b8f: Fuzz and invariant Solidity testing improvements, notably:
  - Significant performance improvements
  - Support for afterInvariant function
  - Support for linked artifacts in get*Code cheatcodes
  - Various bug fixes

## 3.0.0-next.5

### Patch Changes

- bfb708c: Fix HHE411 with improved error message ([#6604](https://github.com/NomicFoundation/hardhat/pull/6604))
- 84b625c: Improve internal error handling for nodejs errors ([#5605](https://github.com/NomicFoundation/hardhat/issues/5605))
- deaaffc: Display skipped and empty `describe` blocks correctly ([#5905](https://github.com/NomicFoundation/hardhat/issues/5905))
- 43418a0: Replace telemetry consent prompt with a task through which telemetry can be explicitly enabled/disabled ([#6573](https://github.com/NomicFoundation/hardhat/pull/6573))
- 3f55677: Support chainId values above 2^32 - 1 for local account transactions ([#6603](https://github.com/NomicFoundation/hardhat/issues/6603))
- 0579708: Upgrade edr-optimism to 0.10.0-alpha.1 and make the hardforks dependent on the chain type ([#6609](https://github.com/NomicFoundation/hardhat/pull/6609))

## 3.0.0-next.4

### Patch Changes

- b3982a2: Add Arbitrum Sepolia to chain config in Ignition ([#6518](https://github.com/NomicFoundation/hardhat/pull/6518))
- 688a233: Fix invalid hex bytecode error in Solidity Test by automatically linking libraries ([#6339](https://github.com/NomicFoundation/hardhat/issues/6339))
- 8d30be9: Add new toolbox `hardhat-mocha-ethers`, that uses Mocha Test Runner, `chai-matchers` and `ethers` ([#5644](https://github.com/NomicFoundation/hardhat/issues/5644))
- 7c9ad25: Infer and display better error messages from stack traces ([#6505](https://github.com/NomicFoundation/hardhat/issues/6505))
- 7e55eb2: Fix remove() on windows ([#5602](https://github.com/NomicFoundation/hardhat/issues/5602))
- 5fbea0d: Improve error categories and add support for subcategories ([#6552](https://github.com/NomicFoundation/hardhat/pull/6552))
- ec8895e: Fix a typo in Hardhat's type `GetArtifactByName` ([#6534](https://github.com/NomicFoundation/hardhat/pull/6534))
- 0a96da8: Generate better error messages when invoking unsupported cheatcodes. Previously we'd just return "unknown selector 0xafc98040", now we return "cheatcode 'broadcast()' is not supported" instead.
- e366bf7: Add new toolbox `hardhat-toolbox-viem`, that uses Node Test Runner and `viem` ([#5643](https://github.com/NomicFoundation/hardhat/issues/5643))
- fc34b96: Fix getCode/getDeployedCode cheatcodes in Solidity Test by compiling all sources ([#6522](https://github.com/NomicFoundation/hardhat/issues/6522))

## 3.0.0-next.3

### Patch Changes

- 7515911: Always support typescript config files, even when not running Hardhat from the CLI
- 7e55eb2: Increase http timeout
- c31b112: Started using streams when handling the solc compiler outputs to support compilation of very large codebases where the compilation outputs might exceed the maximum buffer size/string length.
- 5fc2540: Fix infinite loop that could happen when no solc config was available to build your project.
- 9804974: Warn when using a low interval mining value and mismatching timestamp

## 3.0.0-next.2

### Patch Changes

- aab6d99: Speed up Solidity Tests when forking by setting an rpc cache path ([#6459](https://github.com/NomicFoundation/hardhat/issues/6459))
- 89f95f9: Added support for the `attach` method in `hardhat-typechain` ([#6315](https://github.com/NomicFoundation/hardhat/issues/6315))
- 739f6b3: Don't generate `hardhat-typechain` types for Solidity test files ([#6392](https://github.com/NomicFoundation/hardhat/issues/6392))
- 1e625dc: Fix to ensure we don't generate stack traces if EVM execution is indeterministic.
- c9d81f9: Fixed errors in compiler list downloads with a synchronization mutex ([#6437](https://github.com/NomicFoundation/hardhat/issues/6437))

## 3.0.0-next.1

### Patch Changes

- ee91628: Update to `mocha@11` when running mocha tests ([#6288](https://github.com/NomicFoundation/hardhat/issues/6288))
- e5d4453: Fix unnecessary re-install of hardhat during init ([#6323](https://github.com/NomicFoundation/hardhat/issues/6323))
- bfb708c: Improve error message when build profile is not found ([#6316](https://github.com/NomicFoundation/hardhat/issues/6316))
- e853ff8: Improve error message if a non-existing subtask is invoked ([#6375](https://github.com/NomicFoundation/hardhat/issues/6375))
- 209ea79: Improve the keystore error message displayed when the password is incorrect or the encrypted file is corrupted ([#6331](https://github.com/NomicFoundation/hardhat/issues/6331))
- 67f4981: Fix for `hardhat-network-helpers` where the blockchain `snapshot` was being shared across different network connections ([#6377](https://github.com/NomicFoundation/hardhat/issues/6377))
- 726fe76: Re-enable Ignition visualize task with updated version of mermaid diagrams ([#6291](https://github.com/NomicFoundation/hardhat/issues/6291))
- af5eb2b: Fix for mermaid diagram centering in Ignition visalization report ([#6409](https://github.com/NomicFoundation/hardhat/issues/6409))

## 3.0.0-next.0

Hardhat 3 is a major overhaul with exciting new features:

- 🧪 **Solidity tests** as a first-class testing option
- 🌐 **Multichain support** for today's rollup-centric world
- ⚡ **Rust-powered runtime** for faster execution
- 🧱 **Revamped build system** with full npm compatibility and build profiles
- 🚀 **Hardhat Ignition** for streamlined contract deployments

It's currently in alpha state, but you can try it out and give us feedback!

**Getting started**

To install Hardhat 3, run the following commands in an empty directory:

```
npm init -y
npm install --save-dev hardhat@next
npx hardhat --init
```

This will take you through an interactive setup process to get started using Hardhat 3.

**Learn more**

To learn more about Hardhat 3, check out the [Hardhat 3 Alpha documentation](https://hardhat.org/hardhat3-alpha/).

**Feedback and help**

If you have any questions, feedback, or need help, join the [Hardhat 3 Alpha Telegram group](https://hardhat.org/hardhat3-alpha-telegram-group).

Since this is still an alpha release, things will change, and your feedback can make a big difference. Let us know what you think and need!
