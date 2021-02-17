[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-ethers.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-ethers)
[![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-ethers

[Hardhat](https://hardhat.org) plugin for integration with [ethers.js](https://github.com/ethers-io/ethers.js/).

## What

This plugin brings to Hardhat the Ethereum library `ethers.js`, which allows you to interact with the Ethereum blockchain in a simple way.

## Installation

```bash
npm install --save-dev @nomiclabs/hardhat-ethers 'ethers@^5.0.0'
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-ethers");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomiclabs/hardhat-ethers";
```

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugins adds an `ethers` object to the Hardhat Runtime Environment.

This object has the same API than `ethers.js`, with some extra Hardhat-specific
functionality.

### Provider object

A `provider` field is added to `ethers`, which is an `ethers.providers.Provider`
automatically connected to the selected network.

### Helpers

These helpers are added to the `ethers` object:

```typescript
interface Libraries {
  [libraryName: string]: string;
}

interface FactoryOptions {
  signer?: ethers.Signer;
  libraries?: Libraries;
}

function getContractFactory(name: string): Promise<ethers.ContractFactory>;

function getContractFactory(name: string, signer: ethers.Signer): Promise<ethers.ContractFactory>;

function getContractFactory(name: string, factoryOptions: FactoryOptions): Promise<ethers.ContractFactory>;


function getContractAt(nameOrAbi: string | any[], address: string, signer?: ethers.Signer): Promise<ethers.Contract>;

function getSigners() => Promise<ethers.Signer[]>;

function getSigner(address: string) => Promise<ethers.Signer>;
```

The `Contract`s and `ContractFactory`s returned by these helpers are connected to the first signer returned by `getSigners` by default.

If there is no signer available, `getContractAt` returns read-only contracts.

## Usage

There are no additional steps you need to take for this plugin to work.

Install it and access ethers through the Hardhat Runtime Environment anywhere you need it (tasks, scripts, tests, etc). For example, in your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-ethers");

// task action function receives the Hardhat Runtime Environment as second argument
task(
  "blockNumber",
  "Prints the current block number",
  async (_, { ethers }) => {
    await ethers.provider.getBlockNumber().then((blockNumber) => {
      console.log("Current block number: " + blockNumber);
    });
  }
);

module.exports = {};
```

And then run `npx hardhat blockNumber` to try it.

Read the documentation on the [Hardhat Runtime Environment](https://hardhat.org/advanced/hardhat-runtime-environment.html) to learn how to access the HRE in different ways to use ethers.js from anywhere the HRE is accessible.

### Library linking

Some contracts need to be linked with libraries before they are deployed. You can pass the addresses of their libraries to the `getContractFactory` function with an object like this:

```js
const contractFactory = await this.env.ethers.getContractFactory(
  "Example",
  {
    libraries: {
      ExampleLib: "0x..."
    }
  }
);
```

This allows you to create a contract factory for the `Example` contract and link its `ExampleLib` library references to the address `"0x..."`.

To create a contract factory, all libraries must be linked. An error will be thrown informing you of any missing library.
