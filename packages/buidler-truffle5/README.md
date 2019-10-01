[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-truffle5.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-truffle5)
[![buidler](https://buidler.dev/buidler-plugin-badge.svg?1)](https://buidler.dev)

# buidler-truffle5

[Buidler](http://getbuidler.com) plugin for integration with TruffleContract from Truffle 5. This allows tests and scripts written for Truffle to work with Buidler.

## What

This plugin brings to Buidler TruffleContracts from Truffle 5. With it you can call [`contract()` and `artifacts.require()`](https://truffleframework.com/docs/truffle/testing/writing-tests-in-javascript) like you normally would with Truffle. Interact with your contracts with a familiar API from tasks, scripts and tests.

## Required plugins

This plugin requires [buidler-web3](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3) as a prerequisite.

## Installation

```bash
npm install --save-dev @nomiclabs/buidler-truffle5 @nomiclabs/buidler-web3 web3
```

And add the following statement to your `buidler.config.js`:

```js
usePlugin("@nomiclabs/buidler-truffle5");
```

## Tasks

This plugin creates no additional tasks.

## Environment extensions

An instance of [`TruffleEnvironmentArtifacts`](https://github.com/nomiclabs/buidler/blob/master/packages/buidler-truffle5/src/artifacts.ts) is injected into `env.artifacts` and the method `contract()` is injected into the global scope for using in tests.

## Usage

There are no additional steps you need to take for this plugin to work.
Install it, run `npx buidler test` and your Truffle tests should run with no need to make any modifications.

Take a look at the [testing guide](https://buidler.dev/guides/testing) for a tutorial using it.

## TypeScript support

This plugin supports TypeScript through a type extensions file `type-extensions.d.ts`. Add it to the `files` field of your `tsconfig.json` file to enable TypeScript support. This plugins depends on the [buidler-web3](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3) plugin, so you should add that plugin's type extensions file as well, like this:

```json
"files": [
    "./buidler.config.ts",
    "./node_modules/@nomiclabs/buidler-web3/src/type-extensions.d.ts",
    "./node_modules/@nomiclabs/buidler-truffle5/src/type-extensions.d.ts"
  ]
```
