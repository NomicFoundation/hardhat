# hardhat-vyper

[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-vyper.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-vyper) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

[Hardhat](https://hardhat.org) plugin to develop smart contracts with Vyper.

## What

This plugin adds support for Vyper to Hardhat. Once installed, Vyper contracts can be compiled by running the `compile` task.

This plugin generates the same artifact format as the built-in Solidity compiler, so that it can be used in conjunction with all other plugins.

The Vyper compiler is run using the [official Docker images](https://hub.docker.com/r/vyperlang/vyper).

## Installation

First, you have to install Docker Desktop by following its [Get Started guide](https://www.docker.com/get-started).

Then, you need to install the plugin by running

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

This plugin adds an optional `vyper` entry to Hardhat's config, which lets you specify the Vyper version to use. If no version is given, the [latest one on Docker Hub](https://hub.docker.com/r/vyperlang/vyper/tags) will be used.

This is an example of how to set it:

```js
module.exports = {
  vyper: {
    version: "0.1.0b10",
  },
};
```

## Usage

There are no additional steps you need to take for this plugin to work.
