[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-web3.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-web3)
[![buidler](https://buidler.dev/buidler-plugin-badge.svg?1)](https://buidler.dev)

# buidler-web3

This plugin integrates [Web3.js](https://github.com/ethereum/web3.js) `1.x` into [Buidler](http://getbuidler.com).

## What

This plugin brings to Buidler the Web3 module and an initialized instance of Web3.

# Installation

```bash
npm install --save-dev @nomiclabs/buidler-web3 web3
```

And add the following statement to your `buidler.config.js`:

```js
usePlugin("@nomiclabs/buidler-web3");
```

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugin adds the following elements to the `BuidlerRuntimeEnvironment`:

- `Web3`: The Web3.js module.
- `web3`: An instantiated Web3.js object connected to the selected network.

## Usage
Install it and access Web3.js through the Buidler Runtime Environment anywhere you need it (tasks, scripts, tests, etc). For example, in your `buidler.config.js`:
```
usePlugin("@nomiclabs/buidler-web3");

// task action function receives the Buidler Runtime Environment as second argument
task("accounts", "Prints accounts", async (_, { web3 }) => {
  
  console.log(await web3.eth.getAccounts());
  
});

module.exports = {};
```
And then run `npx buidler accounts` to try it.

Read the documentation on the [Buidler Runtime Environment](https://buidler.dev/documentation/#buidler-runtime-environment-bre) to learn how to access the BRE in different ways to use Web3.js from anywhere the BRE is accessible.

## TypeScript support

You need to add this to your `tsconfig.json`'s `files` array: `"node_modules/@nomiclabs/buidler-web3/src/type-extensions.d.ts"`
