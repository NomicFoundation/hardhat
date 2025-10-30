[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-solpp.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-solpp) [![hardhat](https://v2.hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-solpp

[Hardhat](https://hardhat.org) plugin for integration with the [solpp preprocessor](https://github.com/merklejerk/solpp).

## What

This plugin hooks into the compilation pipeline and runs the solpp preprocessor.

## Installation

```bash
npm install --save-dev @nomiclabs/hardhat-solpp@hh2
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-solpp");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomiclabs/hardhat-solpp";
```

## Environment extensions

This plugin does not extend the environment.

## Usage

There are no additional steps you need to take for this plugin to work.

Install it, run `npx hardhat compile` and solc will compile the solpp generated contracts, which will be in `cache/solpp-generated-contracts`.

## Configuration

This plugin can be configured by setting a `solpp` entry in `hardhat.config.js`. Its options are:

- `defs`: is an object where each property is the symbol's name and its value is the actual definition. Definitions can be numbers, string, expressions, lists, or functions. For more detail about symbols you can check [solpp README](https://github.com/merklejerk/solpp).
- `cwd: string`: directory where the contracts are located, it will be used for flattening purposes, by default it will be the project's source directory.
- `collapseEmptyLines: boolean`: delete empty lines, false by default.
- `noPreprocessor: boolean`: disable preprocessor, false by default.
- `noFlatten: boolean`: won't flatten contracts, true by default.
- `tolerant: boolean`: ignore if an imported contract file is missing when flattening, false by default.
