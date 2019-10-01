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

This plugin provides the `verify-contract` task, which allows you to verify contracts through Etherscan's service.

## Environment extensions

This plugin does not extend the environment.

## Usage

You need to add the following Etherscan config to your `buidler.config.js` file:

```js
module.exports = {
  etherscan: {
    // The url for the Etherscan API you want to use.
    // For example, here we're using the one for the Ropsten test network
    url: "https://api-ropsten.etherscan.io/api",
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: "YOUR_ETHERSCAN_API_KEY"
  }
};
```

Lastly, run the `verify-contract` task like so:

```bash
npx buidler verify-contract --contract-name MyContract --address DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
```

## TypeScript support

You need to add this to your `tsconfig.json`'s `files` array: `"node_modules/@nomiclabs/buidler-etherscan/src/type-extensions.d.ts"`
