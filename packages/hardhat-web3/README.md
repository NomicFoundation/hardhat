[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-web3.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-web3) [![hardhat](https://v2.hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-web3

This plugin integrates [Web3.js](https://github.com/ethereum/web3.js) `1.x` into [Hardhat](https://hardhat.org).

## What

This plugin brings to Hardhat the Web3 module and an initialized instance of Web3.

# Installation

```bash
npm install --save-dev @nomiclabs/hardhat-web3 'web3@^1.0.0-beta.36'
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-web3");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomiclabs/hardhat-web3";
```

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugin adds the following elements to the `HardhatRuntimeEnvironment`:

- `Web3`: The Web3.js module.
- `web3`: An instantiated Web3.js object connected to the selected network.

## Usage

Install it and access Web3.js through the Hardhat Runtime Environment anywhere you need it (tasks, scripts, tests, etc). For example, in your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-web3");

// task action function receives the Hardhat Runtime Environment as second argument
task("accounts", "Prints accounts", async (_, { web3 }) => {
  console.log(await web3.eth.getAccounts());
});

module.exports = {};
```

And then run `npx hardhat accounts` to try it.

Read the documentation on the [Hardhat Runtime Environment](https://v2.hardhat.org/hardhat-runner/docs/advanced/hardhat-runtime-environment) to learn how to access the HRE in different ways to use Web3.js from anywhere the HRE is accessible.
