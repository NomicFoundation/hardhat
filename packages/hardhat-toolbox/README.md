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

### Installation

We recommend using npm 7 or later. If you do that, then you just need to install the plugin itself:

```bash
npm install --save-dev @nomicfoundation/hardhat-toolbox
```

If you are using an older version of npm, you'll also need to install all the packages used by the toolbox.

```bash
npm install --save-dev @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-network-helpers @nomicfoundation/hardhat-chai-matchers @nomiclabs/hardhat-ethers @nomiclabs/hardhat-etherscan chai ethers hardhat-gas-reporter solidity-coverage @typechain/hardhat typechain @typechain/ethers-v5 @ethersproject/abi @ethersproject/providers
```

That's also the case if you are using yarn:

```
yarn add --dev @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-network-helpers @nomicfoundation/hardhat-chai-matchers @nomiclabs/hardhat-ethers @nomiclabs/hardhat-etherscan chai ethers hardhat-gas-reporter solidity-coverage @typechain/hardhat typechain @typechain/ethers-v5 @ethersproject/abi @ethersproject/providers
```

### Migrating to Hardhat Toolbox

Migrating an existing project to the Toolbox is easy:

1. First, if you are using `hardhat-waffle`, we recommend you migrate to our [Hardhat Chai Matchers](https://hardhat.org/hardhat-chai-matchers). They are a drop-in replacement, so this should only take a few minutes. Learn how to do that [here](https://hardhat.org/hardhat-chai-matchers/docs/migrate-from-waffle).
2. Install the toolbox and its dependencies. If you are using npm 7 or later, you just need to do `npm install --save-dev @nomicfoundation/hardhat-toolbox`. If not, check the [Installation section](#installation) above.
3. Uninstall `@nomiclabs/hardhat-waffle` and `ethereum-waffle`, and remove the `@nomiclabs/hardhat-waffle` import from your Hardhat config.
4. Import the Toolbox in your Hardhat config. This will make many other imports redundant, so you can remove any of these if you want:

   - `@nomiclabs/hardhat-ethers`
   - `@nomiclabs/hardhat-etherscan`
   - `hardhat-gas-reporter`
   - `solidity-coverage`
   - `@typechain/hardhat`
