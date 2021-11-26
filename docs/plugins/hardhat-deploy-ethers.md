---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/wighawag/hardhat-deploy-ethers/tree/main)
:::

[![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-deploy-ethers

[Hardhat](https://hardhat.org) plugin for integration with [ethers.js](https://github.com/ethers-io/ethers.js/).

## What

This plugin brings to Hardhat the Ethereum library `ethers.js`, which allows you to interact with the Ethereum blockchain in a simple way.

it is in based on the existing effort by @nomiclabs : `@nomiclabs/hardhat-ethers`
And add extra functionality and the ability to get signer from address string

## Installation

Since `hardhat-deploy-ethers` is a fork of `@nomiclabs/hardhat-ethers` and that other plugin might have an hardcoded dependency on `@nomiclabs/hardhat-etehrs` the best way to install `hardhat-deploy-ethers` and ensure compatibility is the following:

```bash
npm install --save-dev @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers ethers
```

Which means you then add the following statement to your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-ethers");
``` 

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```ts
import "@nomiclabs/hardhat-ethers";
```

Note that in the future, `hardhat-deploy-ethers` will be an extension of `@nomiclabs/hardhat-etehrs` but this is not currently possible without losing features.


Note that if you are sure that no other plugins need `@nomiclabs/hardhat-etehrs` to be installed you can do :

```bash
npm install --save-dev hardhat-deploy-ethers ethers
```

Then add the following statement to your `hardhat.config.js`:

```js
require("hardhat-deploy-ethers");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```ts
import "hardhat-deploy-ethers";
```

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugins adds an `ethers` object to the Hardhat Runtime Environment.

This object has add some extra `hardhat-deploy` specific functionalities.

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

function getContractFactory(name: string, signer?: ethers.Signer | string): Promise<ethers.ContractFactory>;

function getContractFactory(abi: any[], bytecode: ethers.BytesLike, signer?: ethers.Signer | string): Promise<ethers.ContractFactory>;

function getContractFactory(name: string, factoryOptions: FactoryOptions): Promise<ethers.ContractFactory>;


function getContractAt(nameOrAbi: string | any[], address: string, signer?: ethers.Signer | string): Promise<ethers.Contract>;

function getSigners() => Promise<ethers.Signer[]>;

function getSigner(address: string) => Promise<ethers.Signer>;
function getSignerOrNull: (address: string) => Promise<SignerWithAddress | null>;
function getNamedSigners: () => Promise<Record<string, SignerWithAddress>>;
function getNamedSigner: (name: string) => Promise<SignerWithAddress>;
function getNamedSignerOrNull: (name: string) => Promise<SignerWithAddress | null>;
function getUnnamedSigners: () => Promise<SignerWithAddress[]>;

function getContract(deploymentName: string, signer?: ethers.Signer | string): Promise<ethers.Contract>;
function getContractOrNull(deploymentName: string, signer?: ethers.Signer | string): Promise<ethers.Contract | null>;

```

The `Contract`s and `ContractFactory`s returned by these helpers are connected to the first signer returned by `getSigners` by default, if available.
For Contracts if no signers are available it fallback to a read-only provider.

## Usage

There are no additional steps you need to take for this plugin to work.

Install it and access ethers through the Hardhat Runtime Environment anywhere you need it (tasks, scripts, tests, etc). For example, in your `hardhat.config.js`:

```js
usePlugin("hardhat-deploy-ethers");

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


It also automatically integrate with the `hardhat-deploy` plugin if detected 

```js
const contract = await hre.ethers.getContract('<deploymentName>');
```
