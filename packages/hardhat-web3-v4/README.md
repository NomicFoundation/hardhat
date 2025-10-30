[![npm](https://img.shields.io/npm/v/@nomicfoundation/hardhat-web3-v4.svg)](https://www.npmjs.com/package/@nomicfoundation/hardhat-web3-v4) [![hardhat](https://v2.hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-web3-v4

_This plugin is a collaboration between the Nomic Foundation and [ChainSafe](https://chainsafe.io/)_

Integrate [Web3.js](https://github.com/ethereum/web3.js) `4.x` into [Hardhat](https://hardhat.org).

## What

This plugin brings to Hardhat the Web3 module and an initialized instance of Web3.

# Installation

```bash
npm install --save-dev @nomicfoundation/hardhat-web3-v4@hh2 'web3@4'
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomicfoundation/hardhat-web3-v4");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomicfoundation/hardhat-web3-v4";
```

By default, contract invocations will not be typesafe. Consider installing [@chainsafe/hardhat-ts-artifact-plugin](https://www.npmjs.com/package/@chainsafe/hardhat-ts-artifact-plugin) to obtain available contract methods and events. Read more about inferring types [here](https://docs.web3js.org/guides/smart_contracts/infer_contract_types/).

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugin adds the following elements to the `HardhatRuntimeEnvironment`:

- `Web3`: The Web3.js module.
- `web3`: An instantiated Web3.js object connected to the selected network.

## Usage

Install it and access Web3.js through the Hardhat Runtime Environment anywhere you need it (tasks, scripts, tests, etc). For example, in your `hardhat.config.js`:

```js
require("@nomicfoundation/hardhat-web3-v4");

// task action function receives the Hardhat Runtime Environment as second argument
task("accounts", "Prints accounts", async (_, { web3 }) => {
  console.log(await web3.eth.getAccounts());
});
```

And then run `npx hardhat accounts` to try it.

Read the documentation on the [Hardhat Runtime Environment](https://v2.hardhat.org/hardhat-runner/docs/advanced/hardhat-runtime-environment) to learn how to access the HRE in different ways to use Web3.js from anywhere the HRE is accessible.
