[![npm](https://img.shields.io/npm/v/@nomicfoundation/hardhat-ignition.svg)](https://www.npmjs.com/package/@nomicfoundation/hardhat-ignition) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-ignition

Hardhat plugin for orchestrating deployments.

## What

This plugin brings **Ignition** to your **Hardhat** project, allowing you to orchestrate complex deployments to **mainnet**, to a local **Hardhat node** or within tests.

## Installation

```bash
npm install --save-dev @nomicfoundation/hardhat-ignition
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomicfoundation/hardhat-ignition");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomicfoundation/hardhat-ignition";
```

## Tasks

This plugin provides the `deploy` and `visualize` tasks.

## Usage

Please see the [getting started guide](../../docs/getting-started-guide.md)
