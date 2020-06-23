[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-ethers.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-ethers)
[![buidler](https://buidler.dev/buidler-plugin-badge.svg?1)](https://buidler.dev)

# buidler-ethers

[Buidler](http://getbuidler.com) plugin for integration with [ethers.js](https://github.com/ethers-io/ethers.js/).

## What

This plugin brings to Buidler the Ethereum library `ethers.js`, which allows you to interact with the Ethereum blockchain in a simple way.

## Installation

```bash
npm install --save-dev @nomiclabs/buidler-ethers 'ethers@^5.0.0'
```

And add the following statement to your `buidler.config.js`:

```js
usePlugin("@nomiclabs/buidler-ethers");
```

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugins adds an `ethers` object to the Buidler Runtime Environment.

This object has the same API than `ethers.js`, with some extra Buidler-specific
functionality.

### Provider object

A `provider` field is added to `ethers`, which is an `ethers.providers.Provider`
automatically connected to the selected network.

### Helpers

These helpers are added to the `ethers` object:

```typescript
function getContractFactory(name: string, signer?: ethers.Signer): Promise<ethers.ContractFactory>;


function getContractAt(nameOrAbi: string | any[], address: string, signer?: ethers.Signer): Promise<ethers.Contract>;

function getSigners() => Promise<ethers.Signer[]>;
```

The `Contract`s and `ContractFactory`s returned by these helpers are connected to the first signer returned by `getSigners` be default.

## Usage

There are no additional steps you need to take for this plugin to work.

Install it and access ethers through the Buidler Runtime Environment anywhere you need it (tasks, scripts, tests, etc). For example, in your `buidler.config.js`:

```js
usePlugin("@nomiclabs/buidler-ethers");

// task action function receives the Buidler Runtime Environment as second argument
task(
  "blockNumber",
  "Prints the current block number",
  async (_, { ethers }) => {
    await ethers.provider.getBlockNumber().then((blockNumber) => {
      console.log("Current block number: " + blockNumber);
    });
  }
);

module.exports = {};
```

And then run `npx buidler blockNumber` to try it.

Read the documentation on the [Buidler Runtime Environment](https://buidler.dev/advanced/buidler-runtime-environment.html) to learn how to access the BRE in different ways to use ethers.js from anywhere the BRE is accessible.

## TypeScript support

You need to add this to your `tsconfig.json`'s `files` array: `"node_modules/@nomiclabs/buidler-ethers/src/type-extensions.d.ts"`
