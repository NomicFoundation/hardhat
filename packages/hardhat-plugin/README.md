# hardhat-ignition

Hardhat plugin for orchestrating deployments.

## What

This plugin brings **Ignition** to your **Hardhat** project, allowing you to orchestrate complex deployments to **mainnet**, to a local **Hardhat node** or within tests.

## Installation

```bash
npm install --save-dev @nomiclabs/hardhat-ignition
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-ignition");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomiclabs/hardhat-ignition";
```

## Tasks

This plugin provides the `deploy` task.

## Usage

Please see the [getting started guide](../../docs/getting-started-guide.md)
