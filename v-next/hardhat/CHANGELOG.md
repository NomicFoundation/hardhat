# hardhat

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
