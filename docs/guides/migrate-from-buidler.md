# Migrating from Buidler

Hardhat is the new and evolved version of Buidler.

This guide will teach you how to migrate your project from Buidler into Hardhat.

## Installing the Hardhat packages

The first thing you need to do to migrate your project, is installing the new npm packages.

The package `@nomiclabs/buidler` is now `hardhat`. The plugins, which used to have packages like `@nomiclabs/buidler-<name>`,
are now `@nomiclabs/hardhat-<name>`.

For example, if you were using `@nomiclabs/buidler` and `@nomiclabs/buidler-ethers`, you need to run:

```
npm install --save-dev hardhat @nomiclabs/hardhat-ethers
```

If you were using a global installation of Buidler, you also need to install Hardhat locally.
Global installations of Hardhat are not supported.

## Adapting your config

You can use your Buidler config in Hardhat mostly unchanged. All you need to do is follow these steps.

### Renaming your config file

First, you need to rename your config file from `buidler.config.js` to `hardhat.config.js`. Or,
if you are using TypeScript, from `buidler.config.ts` to `hardhat.config.ts`.

### Changing how your plugins are loaded

Then, you have to change how your plugins are loaded. Instead of using the `usePlugin` function, you just
have to require/import their npm package. For example, if you had

```js
usePlugin("@nomiclabs/buidler-ethers");
```

you need to replace it with

```js
require("@nomiclabs/buidler-ethers");
```

Or, if you are using TypeScript, with

```ts
import "@nomiclabs/buidler-ethers";
```

If you were importing the `usePlugin` function explicitly, you also need to remove that import, as the
function doesn't exist anymore.

### Configuring Hardhat Network

Buidler EVM is now Hardhat Network, so if you are customizing it using the `buidlerevm` network config field,
you need to rename it to `hardhat`. You can learn more about how to customize it, including enabling the Mainnet Forking
functionality, [here](./config/README.md#hardhat-network).

For example, if you had something like this in your config:

```js
networks: {
  buidlerevm: {
    blockGasLimit: 12000000
  }
}
```

you need to replace it with:

```js
networks: {
  hardhat: {
    blockGasLimit: 12000000
  }
}
```

### Updating your Solidity config

Hardhat has native support for multiple versions of Solidity. This requires a few changes in how you customize your
`solc` setup.

If you had something like this in your config:

```js
solc: {
  version: "0.7.1",
  optimizer: {
    enabled: true
  }
}
```

You should change it to this:

```js
solidity: {
  version: "0.7.1",
  settings: {
    optimizer: {
      enabled: true
    }
  }
}
```

This is a very simple config, but Hardhat supports arbitrarily complex compilation setups,
down to the individual file level. Take a look at [this guide](./compile-contracts.md) to learn more about it.

## TypeScript support changes

Hardhat enables its TypeScript support when your config is written in TypeScript and ends in `.ts`. If you were using
TypeScript, but a JavaScript config, please take a look at [this guide](./typescript.md).

You don't need a `tsconfig.json` file with Hardhat. We recommend you delete it.

If you prefer to keep it, you should base it on the template presented [here](./typescript.md#customizing-typescript-with-a-tsconfig-json-file). Just make
sure you removed all the `type-extension.d.ts` files, and keep your config file in your `files` field.

## Importing artifacts and ambiguous names

Hardhat supports multiple contracts with the same name.

If you have contracts which share their name, you can't import their artifacts using just the name. 

For example, if you have a contract named `Ownable`, and one of your dependencies has a contract with the same name, you won't be able to do
`artifacts.require("Ownable")` nor `ethers.getContractFactory("Ownable")`. You need to use the contract's Fully
Qualified Name instead (e.g. `contracts/Ownable.sol:Ownable`).

If you try to import a contract with a repeated name, Hardhat will fail, with an error that includes the different
options to fix it. All you need to do is copy & paste them.

For example, you may need to replace this

```js
const Ownable = await ethers.getContractFactory("Ownable");
```

with this

```js
const Ownable = await ethers.getContractFactory("contracts/Ownable.sol:Ownable");
```

## Mocha and VSCode setup changes

If you are running your tests directly with Mocha, or through a VSCode Mocha plugin, please take a look at [this
updated guide](./vscode-tests.md).

## Community plugins

All of the official Buidler plugins have already been migrated to Hardhat.

Some community-built plugins, haven't been migrated yet. If you are using one of those, you have to temporarily disable them.

### buidler-deploy

This plugin is already being ported to Hardhat, and close to being released.

Join the `#buidler-deploy` channel on [Discord](/discord) to get news and help about it.

### buidler-typechain

The TypeChain plugin hasn't been migrated yet, but you can run TypeChain directly like this:

```
npx typechain --target ethers-v5 --outDir typechain  'artifacts/!(build-info)/*/!(.dbg).json'
```

You just need to make sure that your contracts have already been compiled.

Take a look at its [README](https://github.com/ethereum-ts/TypeChain) to learn more about its different options.

### solidity-coverage and buidler-gas-reporter

These plugins are being ported to Hardhat. Join our [Discord Server](/discord) to receive our announcements when they are released.
