[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-ganache.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-ganache) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-ganache

This Hardhat plugin automatically starts and stops [Ganache](https://github.com/trufflesuite/ganache-core) when running tests or scripts.

## What

This plugin creates a network named `ganache`. When this network is used, a Ganache server will be automatically started before running tests and scripts, and stopped when finished.

## Installation

```bash
npm install --save-dev @nomiclabs/hardhat-ganache
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-ganache");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomiclabs/hardhat-ganache";
```

## Tasks

This plugin hooks into the `test` and `run` tasks to wrap them in the instantiation and termination of a `ganache-core` instance. This plugin creates no additional tasks.

## Environment extensions

This plugin doesn't extend the Hardhat Runtime Environment.

## Usage

There are no additional steps you need to take for this plugin to work.

## Configuration

You can set any of the [Ganache's options](https://github.com/trufflesuite/ganache-core#options) through the `ganache` network config. All of them are supported, with the exception of `accounts`.

This example sets a larger block gas limit and the default balance of Ganache's accounts.

```js
module.exports = {
  defaultNetwork: "ganache",
  networks: {
    ganache: {
      gasLimit: 6000000000,
      defaultBalanceEther: 10,
    },
  },
};
```

Note: The `accounts` option is not currently supported.
