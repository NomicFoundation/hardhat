# hardhat-vyper

[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-vyper.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-vyper) [![hardhat](https://v2.hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

[Hardhat](https://hardhat.org) plugin to develop smart contracts with Vyper.

## What

This plugin adds support for Vyper to Hardhat. Once installed, Vyper contracts can be compiled by running the `compile` task.

This plugin generates the same artifact format as the built-in Solidity compiler, so that it can be used in conjunction with all other plugins.

The Vyper compiler is run using the [official binary releases](https://github.com/vyperlang/vyper/releases).

## Installation

First, you need to install the plugin by running

```bash
npm install --save-dev @nomiclabs/hardhat-vyper
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-vyper");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomiclabs/hardhat-vyper";
```

## Required plugins

No plugins dependencies.

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugin does not extend the Hardhat Runtime Environment.

## Configuration

This plugin adds an optional `vyper` entry to Hardhat's config, which lets you specify the Vyper version to use.

This is an example of how to set it:

```js
module.exports = {
  vyper: {
    version: "0.3.0",
  },
};
```

You can also configure multiple versions of the Vyper compiler, as well as the compiler settings evmVersion and optimize. See the [Vyper docs](https://docs.vyperlang.org/en/v0.3.10/compiling-a-contract.html) for more info.

```js
module.exports = {
  vyper: {
    compilers: [
      {
        version: "0.2.1",
      },
      {
        version: "0.3.10",
        settings: {
          evmVersion: "paris",
          optimize: "gas",
        },
      },
    ],
  },
};
```

## Usage

There are no additional steps you need to take for this plugin to work.

## Test directives

Brownie allows you to use the test directive `#@ if mode == "test":` to specify when a portion of code should be included only for testing purposes.

Example:

```py
#@ if mode == "test":
@external
def _mint_for_testing(_to: address, _token_id: uint256):
    self._mint(_to, _token_id)
#@ endif
```

We do NOT support this feature. An error will be thrown every time that, when compiling a contract, the directive `#@ if mode == "test":` is found.

### Additional notes

The oldest vyper version supported by this plugin is 0.2.0. Versions older than this will not work and will throw an error.
