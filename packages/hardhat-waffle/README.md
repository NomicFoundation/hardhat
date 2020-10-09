[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-waffle.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-waffle)
[![hardhat](https://usehardhat.com/hardhat-plugin-badge.svg?1)](https://usehardhat.com)

# hardhat-waffle

[Hardhat](http://gethardhat.com) plugin for integration with [Waffle](https://getwaffle.io/).

## What

You can use this plugin to build smart contract tests using Waffle in Hardhat,
taking advantage of both.

This plugin adds a Hardhat-ready version of Waffle to the Hardhat Runtime Environment,
and automatically initializes the [Waffle Chai matchers](https://ethereum-waffle.readthedocs.io/en/latest/matchers.html).

## Installation

```bash
npm install --save-dev @nomiclabs/hardhat-waffle 'ethereum-waffle@^3.0.0' @nomiclabs/hardhat-ethers 'ethers@^5.0.0'
```

And add the following statement to your `hardhat.config.js`:

```js
usePlugin("@nomiclabs/hardhat-waffle");
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

This plugin depends on [`@nomiclabs/hardhat-ethers`](https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-ethers),
so it also injects an `ethers` object into the HRE, which is documented [here](https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-ethers#environment-extensions).

## Usage

Once installed, you can build your tests almost like in Waffle.

Instead of importing things from `ethereum-waffle`, you access them from the `waffle` property of the Hardhat Runtime Environment.

For example, instead of doing

```typescript
import { deployContract } from "ethereum-waffle";
```

you should do

```typescript
import { waffle } from "hardhat";
const { deployContract } = waffle;
```

Also, you don't need to call `chai.use`.

Note that by default, Hardhat save its compilation output into `artifacts/` instead of `build/`. You can either use
that directory in your tests, or [customize your Hardhat config](https://usehardhat.com/config/#path-configuration).

## TypeScript support

This plugin supports TypeScript by following these steps:

1. Create a `hardhat-env.d.ts` file like this:

    ``` typescript
    /// <reference types="@nomiclabs/hardhat-waffle" />
    /// <reference types="@nomiclabs/hardhat-ethers" />
    ```

    If you already have this file, just add those lines to it.

    Then you have to include that file in the `files` array of your `tsconfig.json`:

    ```
    {
      ...
      "files": [..., "hardhat-env.d.ts"]
    }
    ```

    using the relative path from the `tsconfig.json` to your `hardhat-env.d.ts`.

2. Install these packages: `npm install --save-dev @types/mocha @types/chai`

We also recommend enabling `resolveJsonModule` in your `tsconfig.json`, as it's common
to import JSON files directly when using Waffle.

There's no need to import the Waffle's `solidity` Chai matchers. They are
automatically imported and initialized by this plugin, including its types.
