[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-truffle4.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-truffle4)
 [![Build Status](https://travis-ci.com/nomiclabs/buidler-truffle4.svg?branch=master)](https://travis-ci.com/nomiclabs/buidler-truffle4)


# buidler-truffle4
[Buidler](http://getbuidler.com) plugin for integration with TruffleContract from Truffle 4

## What
This plugin brings to Buidler TruffleContracts from Truffle 4. With it you can call [`contract()` and `artifacts.require()`](https://truffleframework.com/docs/truffle/testing/writing-tests-in-javascript) like you normally would with Truffle. Interact with your contracts with a familiar API from tasks, scripts and tests.

Additionally, you can **migrate your contracts to Solidity 5 without needing to migrate your tests to Truffle 5**.

## Installation
```
npm install @nomiclabs/buidler-truffle4 web3@^0.20.7
```

And add the following require to the top of your ```buidler.config.js```:

```require("@nomiclabs/buidler-truffle4");```

## Tasks
This plugin creates no additional tasks.

## Environment extensions
An instance of [`TruffleEnvironmentArtifacts`](./src/artifacts.ts) is injected into `env.artifacts` and the method `contract()` is injected into the global scope for using in tests.

## Usage
There are no additional steps you need to take for this plugin to work. Install it, run `npx buidler test` and your Truffle tests should run with no need to make any modifications.
