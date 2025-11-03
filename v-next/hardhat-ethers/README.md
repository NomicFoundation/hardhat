# hardhat-ethers

This plugin integrates [ethers.js](https://ethers.org/) into Hardhat, adding an `ethers` object to each network connection.

## Installation

> This plugin is part of the [Ethers+Mocha Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-mocha-ethers). If you are using that toolbox, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-ethers
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```ts
import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";

export default defineConfig({
  plugins: [hardhatEthers],
});
```

## Usage

This plugin adds an `ethers` property to each network connection:

```ts
import { network } from "hardhat";

const { ethers } = await network.connect();

const counter = await ethers.deployContract("Counter");
await counter.inc();
console.log(await counter.x());
```

This object has the same API as [ethers.js](https://docs.ethers.org/), with some extra Hardhat-specific functionality. The rest of this section describes the most important extra features. Check the [API reference](#api) below for the complete list of extensions.

### Provider

The plugin adds a `provider` property to the `ethers` object: an [ethers.js provider](https://docs.ethers.org/v6/single-page/#api_providers__Provider) connected to the network selected by `network.connect()`.

```ts
const blockNumber = await ethers.provider.getBlockNumber();

const balance = await ethers.provider.getBalance(someAddress);
```

Use `ethers.provider` to access read-only blockchain data, such as accounts state, block data, or transactions objects.

### Deploying contracts

The `hardhat-ethers` plugin also adds a `deployContract` method to the `ethers` object, which allows you to easily deploy contracts from your project:

```ts
const counter = await ethers.deployContract("Counter");

await counter.inc();
console.log(await counter.x());
```

### Library linking

Some contracts need to be linked with libraries before they are deployed. You can pass the addresses of their libraries to methods like `deployContract` with an object mapping library names to their addresses:

```ts
const counter = await ethers.deployContract("Counter", {
  libraries: {
    SafeMath: "0x...",
  },
});
```

This allows you to deploy an instance of the `Counter` contract, linking its `SafeMath` library to the address `"0x..."`. The plugin will throw an error if you try to deploy a contract or create a factory without linking the necessary libraries.

## API

### `provider`

An [ethers.js provider](https://docs.ethers.org/v6/single-page/#api_providers__Provider) connected to the network you selected when calling `network.connect`:

```ts
// the network selected with --network option if specified, or the default network otherwise
const { ethers } = await network.connect();

// a specific network from the config
const { ethers } = await network.connect("mainnet");
```

### `deployContract`

Deploys a contract from your project.

```ts
function deployContract(
  name: string,
  constructorArgs?: any[],
  signer?: ethers.Signer,
): Promise<ethers.Contract>;
```

Receives the name of the contract to deploy. Most of the time this will be the name of the contract:

```ts
const counter = await ethers.deployContract("Counter");
```

If you have two contracts with the same name in different files, you'll need to use the fully qualified name of the contract, which includes its source name:

```ts
const counter = await ethers.deployContract("contracts/Counter.sol:Counter");
```

If your contract has constructor parameters, you can pass them as the second argument:

```ts
const counter = await ethers.deployContract("Counter", [42]);
```

By default, the contract will be deployed with the first available signer. If you want to use a different one, you can pass it as the third argument:

```ts
const [defaultSigner, deployer] = await ethers.getSigners();
const counter = await ethers.deployContract("Counter", [], deployer);
```

### `getContractFactory`

Returns an [ethers.js contract factory](https://docs.ethers.org/v6/single-page/#api_contract__ContractFactory).

```ts
function getContractFactory(
  name: string,
  signer?: ethers.Signer,
): Promise<ethers.ContractFactory>;
function getContractFactory(
  name: string,
  factoryOptions: FactoryOptions,
): Promise<ethers.ContractFactory>;
function getContractFactory(
  abi: any[],
  bytecode: ethers.utils.BytesLike,
  signer?: ethers.Signer,
): Promise<ethers.ContractFactory>;
```

It can receive a contract name:

```ts
const Counter = await ethers.getContractFactory("Counter");
const counter = await Counter.deploy();
```

Or an ABI and a deployment bytecode:

```ts
const Counter = await ethers.getContractFactory(counterAbi, counterBytecode);
const counter = await Counter.deploy();
```

By default, the contracts deployed with the factory will use the first signer in the config. If you want to use a different signer, you can pass it as the second argument:

```ts
const [defaultSigner, deployer] = await ethers.getSigners();
const Counter = await ethers.getContractFactory("Counter", deployer);
const counter = await Counter.deploy();
```

### `getContractAt`

Returns an [ethers.js contract instance](https://docs.ethers.org/v6/single-page/#api_contract) connected to a specific address.

```ts
function getContractAt(
  name: string,
  address: string,
  signer?: ethers.Signer,
): Promise<ethers.Contract>;
function getContractAt(
  abi: any[],
  address: string,
  signer?: ethers.Signer,
): Promise<ethers.Contract>;
```

It can receive a contract name and an address:

```ts
const counter = await ethers.getContractAt("Counter", "0x1234...abcd");
```

Or an ABI and an address:

```ts
const counter = await ethers.getContractAt(counterAbi, "0x1234...abcd");
```

By default, the contract will be connected to the first signer in the config. If you want to use a different signer, you can pass it as the third argument:

```ts
const [defaultSigner, caller] = await ethers.getSigners();
const counter = await ethers.getContractAt("Counter", "0x1234...abcd", caller);
```

### `getSigners`

Returns an array of [ethers.js signers](https://docs.ethers.org/v6/single-page/#api_providers__Signer) that correspond to the accounts configured in your Hardhat project.

```ts
function getSigners(): Promise<ethers.Signer[]>;
```

For example:

```ts
const signers = await ethers.getSigners();
```

### `getSigner`

Returns a specific [ethers.js signer](https://docs.ethers.org/v6/single-page/#api_providers__Signer) by its address.

```ts
function getSigner(address: string): Promise<ethers.Signer>;
```

For example:

```ts
const signer = await ethers.getSigner("0x1234...abcd");
```

### `getImpersonatedSigner`

Like [`getSigner`](#getSigner), but it impersonates the given address, allowing you to use it even if you don't have its private key.

```ts
function getImpersonatedSigner(address: string): Promise<ethers.Signer>;
```

For example:

```ts
const impersonatedSigner = await ethers.getImpersonatedSigner("0x1234...abcd");
```

### `getContractFactoryFromArtifact`

Like `getContractFactory`, but receives a Hardhat artifact.

```ts
function getContractFactoryFromArtifact(
  artifact: Artifact,
  signer?: ethers.Signer,
): Promise<ethers.ContractFactory>;
function getContractFactoryFromArtifact(
  artifact: Artifact,
  factoryOptions: FactoryOptions,
): Promise<ethers.ContractFactory>;
```

### `getContractAtFromArtifact`

Like `getContractAt`, but receives a Hardhat artifact.

```ts
function getContractAtFromArtifact(
  artifact: Artifact,
  address: string,
  signer?: ethers.Signer,
): Promise<ethers.Contract>;
```
