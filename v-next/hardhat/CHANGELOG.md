# hardhat

## 3.0.0-next.2

### Patch Changes

- 739f6b3: Don't generate `hardhat-typechain` types for Solidity test files ([#6392](https://github.com/NomicFoundation/hardhat/issues/6392))
- 1e625dc: Fix to ensure we don't generate stack traces if EVM execution is indeterministic.
- aab6d99: Speed up Solidity Tests when forking by setting an rpc cache path ([#6459](https://github.com/NomicFoundation/hardhat/issues/6459))
- c9d81f9: Fixed errors in compiler list downloads with a synchronization mutex ([#6437](https://github.com/NomicFoundation/hardhat/issues/6437))
- 89f95f9: Added support for the `attach` method in `hardhat-typechain` ([#6315](https://github.com/NomicFoundation/hardhat/issues/6315))

## 3.0.0-next.2

### Patch Changes

- 739f6b3: Don't generate `hardhat-typechain` types for Solidity test files ([#6392](https://github.com/NomicFoundation/hardhat/issues/6392))
- 1e625dc: Fix to ensure we don't generate stack traces if EVM execution is indeterministic.
- aab6d99: Speed up Solidity Tests when forking by setting an rpc cache path ([#6459](https://github.com/NomicFoundation/hardhat/issues/6459))
- c9d81f9: Fixed errors in compiler list downloads with a synchronization mutex ([#6437](https://github.com/NomicFoundation/hardhat/issues/6437))
- 89f95f9: Added support for the `attach` method in `hardhat-typechain` ([#6315](https://github.com/NomicFoundation/hardhat/issues/6315))
- Updated dependencies [c9d81f9]
- Updated dependencies
  - @nomicfoundation/hardhat-utils@3.0.0-next.2
  - @nomicfoundation/hardhat-errors@3.0.0-next.2
  - @nomicfoundation/hardhat-zod-utils@3.0.0-next.2

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
