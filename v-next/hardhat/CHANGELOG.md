# hardhat

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
