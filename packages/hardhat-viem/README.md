[![npm](https://img.shields.io/npm/v/@nomicfoundation/hardhat-viem.svg)](https://www.npmjs.com/package/@nomicfoundation/hardhat-viem) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-viem

[Hardhat](https://hardhat.org) plugin for integration with [viem](https://github.com/wagmi-dev/viem), an alternative Ethereum library.

## What

This plugin integrates the Viem Ethereum library into your Hardhat development environment. Viem is designed as an alternative to ethers.js, offering developers a different way to interact with the Ethereum blockchain.

By installing and configuring `hardhat-viem`, you gain access to the capabilities of the Viem library directly within your Hardhat projects. This integration enables you to perform various Ethereum-related tasks using Viem's features and functionalities.

Note: This plugin relies on the Viem library, so familiarity with [Viem's documentation](https://viem.sh/docs/getting-started.html) can enhance your experience when working with `hardhat-viem`.

## Installation

```bash
npm install --save-dev @nomicfoundation/hardhat-viem viem
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomicfoundation/hardhat-viem");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomicfoundation/hardhat-viem";
```

## Required plugins

No plugins dependencies.

## Tasks

This plugin creates no additional tasks.

## Environment extensions

This plugins adds a `viem` object to the Hardhat Runtime Environment which provides a minimal set of capabilities for interacting with the blockchain.

### Clients

Viem supports three types of clients:

#### Public client

A Public Client is an interface to "public" JSON-RPC API methods such as retrieving block numbers, transactions, reading from smart contracts, etc through [Public Actions](https://viem.sh/docs/actions/public/introduction.html).

```typescript
const publicClient = await this.hre.viem.getPublicClient();

const blockNumber = await publicClient.getBlockNumber();

const balance = await publicClient.getBalance({
  address: "0xA0Cf798816D4b9b9866b5330EEa46a18382f251e",
});
```

#### Wallet client

A Wallet Client is an interface to interact with Ethereum Account(s) and provides the ability to retrieve accounts, execute transactions, sign messages, etc through [Wallet Actions](https://viem.sh/docs/actions/wallet/introduction.html).

```typescript
const [fromWalletClient, toWalletClient] =
  await this.hre.viem.getWalletClients();

const hash = await fromWalletClient.sendTransaction({
  to: toWalletClient.account.address,
  value: parseEther("0.0001"),
});
```

```typescript
const walletClient = await this.hre.viem.getWalletClient(
  "0xA0Cf798816D4b9b9866b5330EEa46a18382f251e"
);

const signature = await walletClient.signMessage({
  account,
  message: "hello world",
});
```

#### Test client

A Test Client is an interface to "test" JSON-RPC API methods accessible through a local Ethereum test node such as Anvil or Hardhat such as mining blocks, impersonating accounts, setting fees, etc through [Test Actions](https://viem.sh/docs/actions/test/introduction.html).

```typescript
const testClient = await this.hre.viem.getTestClient();

await testClient.mine({
  blocks: 1000000,
});
```

#### Client options

You can pass options to the `getPublicClient`, `getWalletClient`, and `getTestClient` methods to customize the client's behavior.

```typescript
const publicClient = await this.hre.viem.getPublicClient({
  pollingInterval: 1000,
  cacheTime: 2000,
});
```

For a complete list of options, see:

- [Public client parameters](https://viem.sh/docs/clients/public.html#parameters)
- [Wallet client parameters](https://viem.sh/docs/clients/wallet.html#parameters)
- [Test client parameters](https://viem.sh/docs/clients/test.html#parameters)

### Contracts

The `viem` object provides convenient methods for deploying and interacting with smart contracts on the blockchain.

#### Deploying a Contract

To deploy a contract to the blockchain, use the `deployContract` method:

```typescript
const contract = await this.hre.viem.deployContract("contractName", [
  "arg1",
  50,
  "arg3",
]);
```

By default, the first wallet client retrieve by `hre.viem.getWalletClients()` is used to deploy the contract. You can also specify a different wallet client by passing a third parameter, along with other properties such as `gas`, and `value`:

```typescript
const [_, secondWalletClient] = await this.hre.viem.getWalletClients();

const contractA = await this.hre.viem.deployContract(
  "contractName",
  ["arg1", 50, "arg3"],
  {
    walletClient: secondWalletClient,
    gas: 1000000,
    value: parseEther("0.0001"),
  }
);
```

#### Retrieving an Existing Contract

If the contract is already deployed, you can retrieve an instance of it using the `getContractAt` method:

```typescript
const contract = await this.hre.viem.getContractAt(
  "contractName",
  "0x1234567890123456789012345678901234567890"
);
```

By default, the first wallet client retrieved by `hre.viem.getWalletClients()` is used for contract interaction. If you want to specify a different wallet client, you can do so by passing it as a third parameter, just like when deploying a contract.

```typescript
const [_, secondWalletClient] = await this.hre.viem.getWalletClients();

const contract = await this.hre.viem.getContractAt(
  "contractName",
  "0x1234567890123456789012345678901234567890",
  { walletClient: secondWalletClient }
);
```

#### Interacting with Contracts

Once you have an instance of a contract, you can interact with it by calling its methods:

```typescript
let response = await contract.read.method1();
await contract.write.method2([10, "arg2"]);
```

## Usage

There are no additional steps you need to take for this plugin to work.

Install it and access viem through the Hardhat Runtime Environment anywhere you need it (tasks, scripts, tests, etc).

Read the documentation on the [Hardhat Runtime Environment](https://hardhat.org/hardhat-runner/docs/advanced/hardhat-runtime-environment) to learn how to access the HRE in different ways to use viem from anywhere the HRE is accessible.
