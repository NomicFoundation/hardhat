[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-solhint.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-solhint)
[![buidler](https://buidler.dev/buidler-plugin-badge.svg?1)](https://buidler.dev)

# buidler-solhint

[Buidler](http://getbuidler.com) plugin for integration with [solhint linter](https://github.com/protofire/solhint).

## What

This plugin runs solhint on the project's sources and prints the report.

## Installation

```bash
npm install @nomiclabs/buidler-solhint
```

And add the following statement to your `buidler.config.js`:

```js
usePlugin("@nomiclabs/buidler-solhint");
```

## Tasks

This plugin overrides the `check` task, runs solhint on the project's sources and prints the report to the console.

## Environment extensions

This plugin does not extend the environment.

## Usage

There are no additional steps you need to take for this plugin to work.

Install it, run `npx buidler check` and check the Solhint report.

You may want to add a [solhint configuration](https://github.com/protofire/solhint/blob/master/README.md) file to customize your rules or include a Solhint plugin.
