# hardhat-viem

This plugin integrates [viem](https://viem.sh) into Hardhat, adding a `viem` object to each Network Connection.

## Installation

> This plugin is part of the [Viem Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-viem). If you're using that toolbox, there's nothing else you need to do.

Install the plugin with this command:

```bash
npm install --save-dev @nomicfoundation/hardhat-viem
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```typescript
import { defineConfig } from "hardhat/config";
import hardhatViem from "@nomicfoundation/hardhat-viem";

export default defineConfig({
  plugins: [hardhatViem],
});
```

## Usage

This plugin adds a `viem` property to each Network Connection:

```ts
import { network } from "hardhat";

const { viem } = await hre.network.connect();

const publicClient = await viem.getPublicClient();
console.log(await publicClient.getBlockNumber());

const counter = await viem.deployContract("Counter");
await counter.write.inc();
console.log(await counter.read.x());
```

To learn more about using viem with Hardhat, read [our guide](https://hardhat.org/docs/learn-more/using-viem).

### Clients

Viem provides a set of interfaces to interact with the blockchain called **clients**. There are three types:

- **Public clients** fetch node information from the public JSON-RPC API, like blocks or account balances.
- **Wallet clients** interact with Ethereum Accounts for tasks like transactions and message signing.
- **Test clients** perform actions that are only available in development nodes.

The `viem` object in the Network Connection has methods that make it easy to build clients attached to the current network.

#### Public clients

Get a public client using the `getPublicClient` method:

```ts
const publicClient = await viem.getPublicClient();
console.log(await publicClient.getBlockNumber());
```

Learn more about public clients in the [viem documentation](https://viem.sh/docs/clients/public).

#### Wallet clients

There are two methods related to wallet clients:

- `getWalletClients`: returns an array of wallet clients for all the accounts configured for the network.
- `getWalletClient`: receives an address and returns a wallet client for that address.

```ts
const [walletClient] = await viem.getWalletClients();
await walletClient.sendTransaction(/* ... */);
```

Learn more about wallet clients in the [viem documentation](https://viem.sh/docs/clients/wallet).

#### Test clients

Get a test client using the `getTestClient` method:

```ts
const testClient = await viem.getTestClient();
await testClient.mine({ blocks: 10 });
```

Learn more about test clients in the [viem documentation](https://viem.sh/docs/clients/test).

#### Overriding client options

All the methods to get clients accept an optional parameter to override the default client options. For example, to create a public client with a different polling interval:

```ts
const publicClient = await viem.getPublicClient({
  pollingInterval: 5000,
});
```

These options are the same as the ones used when creating clients with viem directly. Check the [viem documentation](https://viem.sh/docs/clients/intro) to learn more about the available options in each case.

### Contracts

Viem has support for [contract instances](https://viem.sh/docs/contract/getContract), type-safe interfaces for interacting with contracts. This plugin makes it easy to create instances for contracts in your project.

#### Deploying contracts

The `viem` object in the Network Connection has a `deployContract` method that deploys a contract by its name:

```ts
const counter = await viem.deployContract("Counter");
```

If your contract requires constructor arguments, pass them as the second parameter:

```ts
const myContract = await viem.deployContract("MyContract", ["Arg1", 123]);
```

The `deployContract` method waits until the deployment transaction is mined and returns the contract instance. If you want to get the deployment transaction, or if you want to have the contract instance without waiting for the deployment to be mined, use the `sendDeploymentTransaction` method:

```ts
const { contract: counter, deploymentTransaction } =
  await viem.sendDeploymentTransaction("Counter");
```

#### Getting existing contracts

To get an instance of an already deployed contract, use the `getContractAt` method, passing the contract name and address:

```ts
const counter = await viem.getContractAt("Counter", "0x...");
```

## API

The `viem` object added to the Network Connection has the following methods.

### `getPublicClient(publicClientConfig?)`

Returns a viem public client connected to the current network. Optionally pass a configuration object to override the default client options.

### `getWalletClient(address, walletClientConfig?)`

Receives an address and returns a viem wallet client for that address. Optionally pass a configuration object to override the default client options.

### `getWalletClients(walletClientConfig?)`

Returns an array of viem wallet clients for all the accounts configured for the current network. Optionally pass a configuration object to override the default client options.

### `getTestClient(testClientConfig?)`

Returns a viem test client connected to the current network. Optionally pass a configuration object to override the default client options.

### `deployContract(contractName, constructorArgs?, deployContractConfig?)`

Deploys a contract by its name. Optionally pass an array of constructor arguments and a configuration object for the deployment.

The configuration object supports the following properties:

- `confirmations`: the number of confirmations to wait after the deployment transaction is mined. Default is `1`.
- `libraries`: an object specifying the libraries to link in the contract.
- `client`: an object with two properties, `public` and `wallet`, that specify the public and wallet clients to use with the returned contract. At least one of them must be provided.
- `gas`: the gas limit for the transaction.
- `gasPrice`: the gas price for the transaction.
- `maxFeePerGas`: the maximum fee per gas for the transaction.
- `maxPriorityFeePerGas`: the maximum priority fee per gas for the transaction.
- `value`: the value to send with the transaction, in wei.

### `sendDeploymentTransaction(contractName, constructorArgs?, sendDeploymentContractConfig?)`

Same as `deployContract`, but doesn't wait for the deployment to be mined, and returns an object with two properties:

- `contract`: the contract instance, which is available even before the transaction is mined.
- `deploymentTransaction`: the deployment transaction.

The optional configuration object has the same properties as the one in `deployContract`, except for `confirmations`, which is not applicable here.

### `getContractAt(contractName, address, getContractConfig?)`

Returns a contract instance for an already deployed contract. Provide the contract name and address. Optionally pass a configuration object with the following properties:

- `client`: an object with two properties, `public` and `wallet`, that specify the public and wallet clients to use with the returned contract. At least one of them must be provided.
