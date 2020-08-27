[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-etherscan.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-etherscan)
[![buidler](https://buidler.dev/buidler-plugin-badge.svg?1)](https://buidler.dev)

# buidler-etherscan

[Buidler](http://buidler.dev) plugin for integration with [Etherscan](https://etherscan.io)'s contract verification service.

## What

This plugin verifies your contracts on [Etherscan](https://etherscan.io).

## Installation

```bash
npm install --save-dev @nomiclabs/buidler-etherscan
```

And add the following statement to your `buidler.config.js`:

```js
usePlugin("@nomiclabs/buidler-etherscan");
```

## Tasks

This plugin provides the `verify` task, which allows you to verify contracts through Etherscan's service.

## Environment extensions

This plugin does not extend the environment.

## Usage

You need to add the following Etherscan config to your `buidler.config.js` file:

```js
module.exports = {
  networks: {
    mainnet: { ... }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: "YOUR_ETHERSCAN_API_KEY"
  }
};
```

Lastly, run the `verify` task, passing the address of the contract, the network where it's deployed, and the constructor arguments that were used to deploy it (if any):

```bash
npx buidler verify --network mainnet DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
```

### Complex arguments

When the constructor has a complex argument list, it might be easier to write a javascript module that exports the argument list. The expected format is the same as a constructor list for an [ethers contract](https://docs.ethers.io/v5/api/contract/). For example, if you have a contract like this:

```solidity
struct Point {
  uint x;
  uint y;
}

contract Foo {
  constructor (uint x, string s, Point memory point) { ... }
}
```

then you can use an `arguments.js` file like this:

```js
module.exports = [
  50,
  "a string argument",
  {
    x: 10,
    y: 5,
  }
];
```

Where the third argument represents the value for the `point` parameter.

The module can then be loaded by the `verify` task when invoked like this:

```bash
npx buidler verify --constructor-args arguments.js DEPLOYED_CONTRACT_ADDRESS
```

## How it works

The plugin works by fetching the bytecode in the given address and using it to check which contract in your project corresponds to it. Besides that, some sanity checks are performed locally to make sure that the verification won't fail.

## TypeScript support

You need to add this to your `tsconfig.json`'s `files` array: `"node_modules/@nomiclabs/buidler-etherscan/src/type-extensions.d.ts"`
