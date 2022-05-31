[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-truffle5.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-truffle5) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-truffle5

[Hardhat](https://hardhat.org) plugin for integration with TruffleContract from Truffle 5. This allows tests and scripts written for Truffle to work with Hardhat.

## What

This plugin brings to Hardhat TruffleContracts from Truffle 5. With it you can call [`contract()` and `artifacts.require()`](https://truffleframework.com/docs/truffle/testing/writing-tests-in-javascript) like you normally would with Truffle. Interact with your contracts with a familiar API from tasks, scripts and tests.

## Required plugins

This plugin requires [hardhat-web3](https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-web3) as a prerequisite.

## Installation

```bash
npm install --save-dev @nomiclabs/hardhat-truffle5 @nomiclabs/hardhat-web3 web3
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-truffle5");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomiclabs/hardhat-truffle5";
```

## Tasks

This plugin creates no additional tasks.

## Environment extensions

An instance of [`TruffleEnvironmentArtifacts`](https://github.com/nomiclabs/hardhat/blob/master/packages/hardhat-truffle5/src/artifacts.ts) is injected into `env.artifacts` and the method `contract()` is injected into the global scope for using in tests.

## Usage

There are no additional steps you need to take for this plugin to work. Install it, run `npx hardhat test` and your Truffle tests should run with no need to make any modifications.

Take a look at the [testing guide](https://hardhat.org/guides/truffle-testing.html) for a tutorial using it.
