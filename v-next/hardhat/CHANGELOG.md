# hardhat

## 3.0.0-next.2

### Patch Changes

- 739f6b3: Replaced the hook for emitting compiled artifacts and updated its usage in the `hardhat-typechain` plugin.
- 4336742: Hardhat 3 Alpha release: 2025-03-19
- 1e625dc: fix: We generate stack traces for failing Solidity tests by re-executing them for performance reasons. This fix ensures that we don't generate stack traces if EVM execution is indeterministic. Indeterminism can be caused by forking from the latest block number or by using impure cheatcodes.
- 7ea2483: Upgrade sentry from 5.x to 9.x
- aab6d99: Use default value for rpcCachePath when running solidity tests
- c9d81f9: Added a mutex to synchronize compiler list downloads
- Updated dependencies [4336742]
- Updated dependencies [c9d81f9]
  - @nomicfoundation/hardhat-errors@3.0.0-next.2
  - @nomicfoundation/hardhat-utils@3.0.0-next.2
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
