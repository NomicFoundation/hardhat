[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-solpp.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-solpp)
[![buidler](https://buidler.dev/buidler-plugin-badge.svg?1)](https://buidler.dev)

# buidler-solpp

[Buidler](http://getbuidler.com) plugin for integration with the [solpp preprocessor](https://github.com/merklejerk/solpp).

## What

This plugin hooks into the compilation pipeline and runs the solpp preprocessor.

## Installation

```bash
npm install --save-dev @nomiclabs/buidler-solpp
```

And add the following statement to your `buidler.config.js`:

```js
usePlugin("@nomiclabs/buidler-solpp");
```

## Environment extensions

This plugin does not extend the environment.

## Usage

There are no additional steps you need to take for this plugin to work.

Install it, run `npx buidler compile` and solc will compile the solpp generated contracts, which will be in `cache/solpp-generated-contracts`.

## Configuration

This plugin can by configured by setting a `solpp` entry in `buidler.config.js`. Its options are:

- `defs`: is an object where each property is the symbol's name and its value is the actual definition. Definitions can be numbers, string, expressions, lists, or functions. For more detail about symbols you can check [solpp README](https://github.com/merklejerk/solpp).
- `cwd: string`: directory where the contracts are located, it will be used for flattening purposes, by default it will be the project's source directory.
- `collapseEmptyLines: boolean`: delete empty lines, false by default.
- `noPreprocessor: boolean`: disable preprocessor, false by default.
- `noFlatten: boolean`: won't flatten contracts, true by default.
- `tolerant: boolean`: ignore if an imported contract file is missing when flattening, false by default.

## TypeScript support

If your project uses TypeScript, you need to create a `buidler-env.d.ts` file like this:

``` typescript
/// <reference types="@nomiclabs/buidler-solpp" />
```

If you already have this file, just add that line to it.


Then you have to include that file in the `files` array of your `tsconfig.json`:

```json
{
  ...
  "files": [..., "buidler-env.d.ts"]
}
```

using the relative path from the `tsconfig.json` to your `buidler-env.d.ts`.
