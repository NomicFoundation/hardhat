[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-truffle5.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-truffle5)
 [![Build Status](https://travis-ci.com/nomiclabs/buidler-truffle5.svg?branch=master)](https://travis-ci.com/nomiclabs/buidler-truffle5)


# buidler-truffle5
[Buidler](http://getbuidler.com) plugin for integration with TruffleContract from Truffle 5

## What
This plugin brings to Buidler the core testing utilities from Truffle 5. With it you can call [`contract()` and `artifacts.require()`](https://truffleframework.com/docs/truffle/testing/writing-tests-in-javascript) like you normally would with Truffle.

## Installation
```npm install @nomiclabs/buidler-truffle5```

And add the following require to the top of your ```buidler.config.js```:

```require("@nomiclabs/buidler-truffle5")```

## Tasks
This plugin creates no additional tasks.

## Environment extensions
An instance of [`TruffleEnvironmentArtifacts`](./src/artifacts.ts) is injected into `env.artifacts` and the method `contract()` is injected into the global scope for using in tests.

## Usage
There are no additional steps you need to take for this plugin to work. Install it and run `npx buidler test` and your Truffle tests should run with no need to make any modifications.
