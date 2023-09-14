[![npm](https://img.shields.io/npm/v/@ignored/hardhat-ignition.svg)](https://www.npmjs.com/package/@ignored/hardhat-ignition) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-ignition

Hardhat plugin for orchestrating deployments.

## What

This plugin brings **Ignition** to your **Hardhat** project, allowing you to orchestrate complex deployments to **mainnet**, to a local **Hardhat node** or within tests.

## Installation

```bash
npm install --save-dev @ignored/hardhat-ignition
```

And add the following statement to your `hardhat.config.js`:

```js
require("@ignored/hardhat-ignition");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@ignored/hardhat-ignition";
```

## Tasks

This plugin provides the `deploy` and `visualize` tasks.

## Usage

Please see the [getting started guide](../../docs/getting-started-guide.md)
