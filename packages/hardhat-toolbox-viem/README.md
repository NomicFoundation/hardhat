[![npm](https://img.shields.io/npm/v/@nomicfoundation/hardhat-toolbox-viem.svg)](https://www.npmjs.com/package/@nomicfoundation/hardhat-toolbox-viem) [![hardhat](https://v2.hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# Hardhat Toolbox (Viem based)

The `@nomicfoundation/hardhat-toolbox-viem` plugin bundles all the commonly used packages and Hardhat plugins we recommend to start developing with Hardhat.

When you use this plugin, you'll be able to:

- Interact with your contracts using [Viem](https://viem.sh/) and the [`hardhat-viem`](https://v2.hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-viem) plugin.
- Test your contracts with [Mocha](https://mochajs.org/), [Chai](https://chaijs.com/) and [Chai as Promised](https://github.com/domenic/chai-as-promised#chai-assertions-for-promises). Note: the plugin Hardhat Chai Matchers is currently not available for Viem.
- Deploy your contracts with [Hardhat Ignition](https://v2.hardhat.org/ignition).
- Interact with Hardhat Network with our [Hardhat Network Helpers](https://v2.hardhat.org/hardhat-network-helpers).
- Verify the source code of your contracts with the [hardhat-verify](https://v2.hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify) plugin.
- Get metrics on the gas used by your contracts with the [hardhat-gas-reporter](https://github.com/cgewecke/hardhat-gas-reporter) plugin.
- Measure your tests coverage with [solidity-coverage](https://github.com/sc-forks/solidity-coverage).

**Note:** you might want to pin Viem-related dependencies because Viem does not strictly follow semantic versioning for type changes. You can read more [here](https://v2.hardhat.org/hardhat-runner/docs/advanced/using-viem#managing-types-and-version-stability).

### Usage

To create a new project that uses the Toolbox, check our [Setting up a project guide](https://v2.hardhat.org/hardhat-runner/docs/guides/project-setup) but select the _Create a TypeScript project (with Viem)_ option instead.

### Network Helpers

When the Toolbox is installed using npm 7 or later, its peer dependencies are automatically installed. However, these dependencies won't be listed in the `package.json`. As a result, directly importing the Network Helpers can be problematic for certain tools or IDEs. To address this issue, the Toolbox re-exports the Hardhat Network Helpers. You can use them like this:

```ts
import helpers from "@nomicfoundation/hardhat-toolbox/network-helpers";
```
