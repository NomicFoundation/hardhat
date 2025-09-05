[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-solhint.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-solhint) [![hardhat](https://v2.hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-solhint

[Hardhat](https://hardhat.org) plugin for integration with [solhint linter](https://github.com/protofire/solhint).

## What

This plugin runs solhint on the project's sources and prints the report.

## Installation

```bash
npm install --save-dev @nomiclabs/hardhat-solhint
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-solhint");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomiclabs/hardhat-solhint";
```

## Tasks

This plugin overrides the `check` task, runs solhint on the project's sources and prints the report to the console.

## Environment extensions

This plugin does not extend the environment.

## Usage

There are no additional steps you need to take for this plugin to work.

Install it, run `npx hardhat check` and check the Solhint report.

You may want to add a [solhint configuration](https://github.com/protofire/solhint/blob/master) file to customize your rules or include a Solhint plugin.
