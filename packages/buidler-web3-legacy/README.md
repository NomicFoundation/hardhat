[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-web3-legacy.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-web3-legacy)
[![buidler](https://buidler.dev/buidler-plugin-badge.svg?1)](https://buidler.dev)

# buidler-web3-legacy

This plugin integrates [Web3.js](https://github.com/ethereum/web3.js) `0.20x` into [Buidler](http://getbuidler.com).

## What

This plugin brings to Buidler the Web3 module and an initialized instance of Web3.

# Installation

```bash
npm install @nomiclabs/buidler-web3-legacy web3@^0.20.7
```

And add the following statement to your `buidler.config.js`:

```js
usePlugin("@nomiclabs/buidler-web3-legacy");
```

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugin adds the following elements to the `BuidlerRuntimeEnvironment`:

- `Web3`: The Web3.js module.
- `web3`: An instantiated Web3.js object connected to the selected network.
- `pweb3`: A promisified version of `web3`.

## Usage

In Web3 0.20x some features are synchronous and some are asynchronous. For example `web3.eth.accounts` and `web3.eth.blockNumber` are synchronous and not supported. You'll get a `Synchronous requests are not supported, use pweb3 instead` error when trying to access them. To use these you need to use the promisified web3 and call the getter version of the property instead: `await pweb3.eth.getAccounts()`.

## TypeScript support

You need to add this to your `tsconfig.json`'s `files` array: `"node_modules/@nomiclabs/buidler-web3-legacy/src/type-extensions.d.ts"`
