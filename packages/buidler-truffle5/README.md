[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-truffle5.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-truffle5)

# buidler-truffle5

[Buidler](http://getbuidler.com) plugin for integration with TruffleContract from Truffle 5

## What

This plugin brings to Buidler TruffleContracts from Truffle 5. With it you can call [`contract()` and `artifacts.require()`](https://truffleframework.com/docs/truffle/testing/writing-tests-in-javascript) like you normally would with Truffle. Interact with your contracts with a familiar API from tasks, scripts and tests.

## Required plugins

This plugin requires [buidler-web3](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3) as a prerequisite.

## Installation

```bash
npm install @nomiclabs/buidler-truffle5 @nomiclabs/buidler-web3 web3@1.0.0-beta.37
```

And add the following statement to your `buidler.config.js`:

```js
usePlugin("@nomiclabs/buidler-truffle5");
```

## Tasks

This plugin creates no additional tasks.

## Environment extensions

An instance of [`TruffleEnvironmentArtifacts`](./src/artifacts.ts) is injected into `env.artifacts` and the method `contract()` is injected into the global scope for using in tests.

## Usage

There are no additional steps you need to take for this plugin to work.

Install it, run `npx buidler test` and your Truffle tests should run with no need to make any modifications.
