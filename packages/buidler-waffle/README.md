[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-waffle.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-waffle)
[![buidler](https://buidler.dev/buidler-plugin-badge.svg?1)](https://buidler.dev)

# buidler-ethers

[Buidler](http://getbuidler.com) plugin for integration with [Waffle](https://getwaffle.io/).

## What

You can use this plugin to build smart contract tests using Waffle in Buidler, taking advantage of both.

## Installation

```bash
npm install --save-dev @nomiclabs/buidler-waffle ethereum-waffle @nomiclabs/buidler-ethers ethers@^4.0.23
```

And add the following statement to your `buidler.config.js`:

```js
usePlugin("@nomiclabs/buidler-waffle");
```

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugin adds a `waffle` object to the Buidler Runtime Environment. This object has a single property, the Waffle
mock provider.

```ts
waffle: {
  provider: JsonRpcProvider;
}
```

This plugin depends on [`@nomiclabs/buidler-ethers`](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-ethers),
so it also injects an `ethers` object into the BRE, which is documented [here](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-ethers#environment-extensions).

## Usage

Once installed, you can build your tests just like in Waffle. The only difference is that you must use `waffle.provider`
instead of `createMockProvider()`.

Note that by default, Buidler save its compilation output into `artifacts/` instead of `build/`. You can either use
that directory in your tests, or [customize your Buidler config](https://buidler.dev/config/#path-configuration).  

## TypeScript support

This plugin supports TypeScript by following these steps:

1. Add these to your `tsconfig.json`'s `files` array:
   1.1. `"node_modules/@nomiclabs/buidler-ethers/src/type-extensions.d.ts"`
   1.2. `"node_modules/@nomiclabs/buidler-waffle/src/type-extensions.d.ts"`

2. Install this packages: `npm install --save-dev @types/mocha @types/chai @types/sinon-chai`

We also recommend enabling `resolveJsonModule` in your `tsconfig.json`, as it's common
to import JSON files directly when using Waffle.
