[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-web3-legacy.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-web3-legacy) [![hardhat](https://v2.hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-web3-legacy

This plugin integrates [Web3.js](https://github.com/ethereum/web3.js) `0.20x` into [Hardhat](https://hardhat.org).

## What

This plugin brings to Hardhat the Web3 module and an initialized instance of Web3.

# Installation

```bash
npm install --save-dev @nomiclabs/hardhat-web3-legacy web3@^0.20.7
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-web3-legacy");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomiclabs/hardhat-web3-legacy";
```

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugin adds the following elements to the `HardhatRuntimeEnvironment`:

- `Web3`: The Web3.js module.
- `web3`: An instantiated Web3.js object connected to the selected network.
- `pweb3`: A promisified version of `web3`.

## Usage

In Web3 0.20x some features are synchronous and some are asynchronous. For example `web3.eth.accounts` and `web3.eth.blockNumber` are synchronous and not supported. You'll get a `Synchronous requests are not supported, use pweb3 instead` error when trying to access them. To use these you need to use the promisified web3 and call the getter version of the property instead: `await pweb3.eth.getAccounts()`.
