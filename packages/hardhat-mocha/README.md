[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-mocha.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-mocha) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-mocha

[Hardhat](https://hardhat.org) to customize the version of Mocha that your project uses.

## What

This plugin lets you use a different Mocha version than the one built in with Mocha.

## Installation

The major version of this plugin and Mocha that you use must much, so keep it in mind when installing it.

```bash
npm install --save-dev --save-exact '@nomiclabs/hardhat-mocha@^8.0.0' 'mocha@^8.0.0'
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-mocha");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomiclabs/hardhat-mocha";
```

## Tasks

This plugin overrides the subtask that calls mocha so that your local installation is used.

## Environment extensions

This plugin does not extend the environment.

## Usage

There are no additional steps you need to take for this plugin to work.
