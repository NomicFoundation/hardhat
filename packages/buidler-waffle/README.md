[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-waffle.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-waffle)
[![buidler](https://buidler.dev/buidler-plugin-badge.svg?1)](https://buidler.dev)

# buidler-waffle

[Buidler](http://getbuidler.com) plugin for integration with [Waffle](https://getwaffle.io/).

## What

You can use this plugin to build smart contract tests using Waffle in Buidler,
taking advantage of both.

This plugin adds a Buidler-ready version of Waffle to the Buidler Runtime Environment,
and automatically initializes the [Waffle Chai matchers](https://ethereum-waffle.readthedocs.io/en/latest/matchers.html).

## Installation

```bash
npm install --save-dev @nomiclabs/buidler-waffle 'ethereum-waffle@^3.0.0' @nomiclabs/buidler-ethers 'ethers@^5.0.0'
```

And add the following statement to your `buidler.config.js`:

```js
usePlugin("@nomiclabs/buidler-waffle");
```

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugin adds a `waffle` object to the Buidler Runtime Environment. This object has all the Waffle functionality, already adapted to work with Buidler.

The `waffle` object has these properties:

- `provider`
- `deployContract`
- `solidity`
- `link`
- `deployMockContract`
- `createFixtureLoader`
- `loadFixture`

This plugin depends on [`@nomiclabs/buidler-ethers`](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-ethers),
so it also injects an `ethers` object into the BRE, which is documented [here](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-ethers#environment-extensions).

## Usage

Once installed, you can build your tests almost like in Waffle.

Instead of importing things from `ethereum-waffle`, you access them from the `waffle` property of the Buidler Runtime Environment.

For example, instead of doing

```typescript
import { deployContract } from "ethereum-waffle";
```

you should do

```typescript
import { waffle } from "@nomiclabs/buidler";
const { deployContract } = waffle;
```

Also, you don't need to call `chai.use`.

Note that by default, Buidler save its compilation output into `artifacts/` instead of `build/`. You can either use
that directory in your tests, or [customize your Buidler config](https://buidler.dev/config/#path-configuration).

## TypeScript support

This plugin supports TypeScript by following these steps:

1. Create a `buidler-env.d.ts` file like this:

    ``` typescript
    /// <reference types="@nomiclabs/buidler-waffle" />
    /// <reference types="@nomiclabs/buidler-ethers" />
    ```

    If you already have this file, just add those lines to it.

    Then you have to include that file in the `files` array of your `tsconfig.json`:

    ```
    {
      ...
      "files": [..., "buidler-env.d.ts"]
    }
    ```

    using the relative path from the `tsconfig.json` to your `buidler-env.d.ts`.

2. Install these packages: `npm install --save-dev @types/mocha @types/chai`

We also recommend enabling `resolveJsonModule` in your `tsconfig.json`, as it's common
to import JSON files directly when using Waffle.

There's no need to import the Waffle's `solidity` Chai matchers. They are
automatically imported and initialized by this plugin, including its types.
