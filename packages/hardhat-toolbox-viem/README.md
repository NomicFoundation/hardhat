[![npm](https://img.shields.io/npm/v/@nomicfoundation/hardhat-toolbox-viem.svg)](https://www.npmjs.com/package/@nomicfoundation/hardhat-toolbox-viem) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# Hardhat Toolbox (Viem based)

The `@nomicfoundation/hardhat-toolbox-viem` plugin bundles all the commonly used packages and Hardhat plugins we recommend to start developing with Hardhat.

When you use this plugin, you'll be able to:

- Deploy and interact with your contracts using [viem](https://viem.sh/) and the [`hardhat-viem`](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-viem) plugin.
- Test your contracts with [Mocha](https://mochajs.org/), [Chai](https://chaijs.com/). Note: the plugin Hardhat Chai Matchers is currently not available for viem.
- Interact with Hardhat Network with our [Hardhat Network Helpers](https://hardhat.org/hardhat-network-helpers).
- Verify the source code of your contracts with the [hardhat-verify](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify) plugin.
- Get metrics on the gas used by your contracts with the [hardhat-gas-reporter](https://github.com/cgewecke/hardhat-gas-reporter) plugin.
- Measure your tests coverage with [solidity-coverage](https://github.com/sc-forks/solidity-coverage).

### Usage

To create a new project that uses the Toolbox, check our [Setting up a project guide](https://hardhat.org/hardhat-runner/docs/guides/project-setup).

If you want to migrate an existing Hardhat project to use the Toolbox, read [our migration guide](https://hardhat.org/hardhat-runner/docs/guides/migrating-from-hardhat-waffle).

### Network Helpers

When the Toolbox is installed using npm 7 or later, its peer dependencies are automatically installed. However, these dependencies won't be listed in the `package.json`. As a result, directly importing the Network Helpers can be problematic for certain tools or IDEs. To address this issue, the Toolbox re-exports the Hardhat Network Helpers. You can use them like this:

```ts
import helpers from "@nomicfoundation/hardhat-toolbox/network-helpers";
```
