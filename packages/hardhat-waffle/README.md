[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-waffle.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-waffle) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-waffle

[Hardhat](https://hardhat.org) plugin for integration with [Waffle](https://getwaffle.io/).

## What

You can use this plugin to build smart contract tests using Waffle in Hardhat, taking advantage of both.

This plugin adds a Hardhat-ready version of Waffle to the Hardhat Runtime Environment, and automatically initializes the [Waffle Chai matchers](https://ethereum-waffle.readthedocs.io/en/latest/matchers.html).

## Installation

```bash
npm install --save-dev @nomiclabs/hardhat-waffle 'ethereum-waffle@^3.0.0' @nomiclabs/hardhat-ethers 'ethers@^5.0.0'
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-waffle");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomiclabs/hardhat-waffle";
```

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugin adds a `waffle` object to the Hardhat Runtime Environment. This object has all the Waffle functionality, already adapted to work with Hardhat.

The `waffle` object has these properties:

- `provider`
- `deployContract`
- `solidity`
- `link`
- `deployMockContract`
- `createFixtureLoader`
- `loadFixture`

This plugin depends on [`@nomiclabs/hardhat-ethers`](https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-ethers), so it also injects an `ethers` object into the HRE, which is documented [here](https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-ethers#environment-extensions).

## Usage

Once installed, you can build your tests almost like in Waffle.

Instead of importing things from `ethereum-waffle`, you access them from the `waffle` property of the Hardhat Runtime Environment.

For example, instead of doing

```js
const { deployContract } = require("ethereum-waffle");
```

you should do

```typescript
const { waffle } = require("hardhat");
const { deployContract } = waffle;
```

Also, you don't need to call `chai.use` in order to use [Waffle's Chai matchers](https://ethereum-waffle.readthedocs.io/en/latest/matchers.html).

Note that by default, Hardhat saves its compilation output into `artifacts/` instead of `build/`. You can either use that directory in your tests, or [customize your Hardhat config](https://hardhat.org/hardhat-runner/docs/config#path-configuration).
