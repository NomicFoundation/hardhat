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
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: "YOUR_ETHERSCAN_API_KEY"
  }
};
```

Lastly, run the `verify` task like so:

```bash
npx buidler verify DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
```

### Complex arguments

When the constructor has a complex argument list, it might be easier to write a javascript module that exports the argument list. The expected format is the same as a constructor list for an [ethers contract](https://docs.ethers.io/v5/api/contract/). E.g. suppose these are the contents of `arguments.js`:

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

The third argument describes a named tuple with fields `x` and `y`.

The module can then be loaded by the `verify` task when invoked like this:

```bash
npx buidler verify --constructor-args arguments.js DEPLOYED_CONTRACT_ADDRESS
```

## How it works

The plugin queries the ethereum node to determine both the network and the deployed contract bytecode. Then it proceeds to infer which contract among the available source files present in the project is the one that compiles to the deployed bytecode. If the inference is successful, the plugin builds a contract source verification request and sends it to the Etherscan API.

## TypeScript support

You need to add this to your `tsconfig.json`'s `files` array: `"node_modules/@nomiclabs/buidler-etherscan/src/type-extensions.d.ts"`
