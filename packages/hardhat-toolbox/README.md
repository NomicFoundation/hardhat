[![npm](https://img.shields.io/npm/v/@nomicfoundation/hardhat-toolbox.svg)](https://www.npmjs.com/package/@nomicfoundation/hardhat-toolbox) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# Hardhat Toolbox

The `@nomicfoundation/hardhat-toolbox` plugin bundles all the commonly used packages and Hardhat plugins we recommend to start developing with Hardhat.

When you use this plugin, you'll be able to:

- Deploy and interact with your contracts using [ethers.js](https://docs.ethers.io/v5/) and the [`hardhat-ethers`](https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-ethers) plugin.
- Test your contracts with [Mocha](https://mochajs.org/), [Chai](https://chaijs.com/) and our own [Hardhat Chai Matchers](https://hardhat.org/hardhat-chai-matchers) plugin.
- Interact with Hardhat Network with our [Hardhat Network Helpers](https://hardhat.org/hardhat-network-helpers).
- Verify the source code of your contracts with the [hardhat-etherscan](https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-etherscan) plugin.
- Get metrics on the gas used by your contracts with the [hardhat-gas-reporter](https://github.com/cgewecke/hardhat-gas-reporter) plugin.
- Measure your tests coverage with [solidity-coverage](https://github.com/sc-forks/solidity-coverage).
- And, if you are using TypeScript, get type bindings for your contracts with [Typechain](https://github.com/dethcrypto/TypeChain/).

### Usage

To create a new project that uses the Toolbox, check our [Setting up a project guide](https://hardhat.org/hardhat-runner/docs/guides/project-setup).

If you want to migrate an existing Hardhat project to use the Toolbox, read [our migration guide](https://hardhat.org/hardhat-runner/docs/guides/migrating-from-hardhat-waffle).
