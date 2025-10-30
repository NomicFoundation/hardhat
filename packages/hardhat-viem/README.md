[![npm](https://img.shields.io/npm/v/@nomicfoundation/hardhat-viem.svg)](https://www.npmjs.com/package/@nomicfoundation/hardhat-viem) [![hardhat](https://v2.hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-viem

[Hardhat](https://hardhat.org) plugin for integration with [Viem](https://github.com/wagmi-dev/viem), a lightweight, composable, and type-safe Ethereum library.

## What

This plugin integrates the Viem Ethereum library into your Hardhat development environment. Viem is an alternative to [ethers.js](https://docs.ethers.io/) that offers developers a different way to interact with the Ethereum blockchain.

By installing and configuring `hardhat-viem`, you gain access to the capabilities of the Viem library directly within your Hardhat projects. This integration enables you to perform various Ethereum-related tasks using Viem's features and functionalities.

Note: This plugin relies on the Viem library, so familiarity with [Viem's documentation](https://viem.sh/docs/getting-started.html) can enhance your experience when working with `hardhat-viem`.

## Installation

```bash
npm install --save-dev @nomicfoundation/hardhat-viem@hh2 viem
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomicfoundation/hardhat-viem");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomicfoundation/hardhat-viem";
```

**Note:** you might want to pin Viem-related dependencies because Viem does not strictly follow semantic versioning for type changes. You can read more [here](https://v2.hardhat.org/hardhat-runner/docs/advanced/using-viem#managing-types-and-version-stability).

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
import hre from "hardhat";

const publicClient = await hre.viem.getPublicClient();

const blockNumber = await publicClient.getBlockNumber();

const balance = await publicClient.getBalance({
  address: "0xA0Cf798816D4b9b9866b5330EEa46a18382f251e",
});
```

#### Wallet client

A Wallet Client is an interface to interact with Ethereum Accounts and provides the ability to retrieve accounts, execute transactions, sign messages, etc. through [Wallet Actions](https://viem.sh/docs/actions/wallet/introduction.html).

```typescript
import hre from "hardhat";

const [fromWalletClient, toWalletClient] = await hre.viem.getWalletClients();

const hash = await fromWalletClient.sendTransaction({
  to: toWalletClient.account.address,
  value: parseEther("0.0001"),
});
```

```typescript
import hre from "hardhat";

const walletClient = await hre.viem.getWalletClient(
  "0xA0Cf798816D4b9b9866b5330EEa46a18382f251e"
);

const signature = await walletClient.signMessage({
  account,
  message: "hello world",
});
```

#### Test client

A Test Client is an interface to "test" JSON-RPC API methods such as mining blocks, impersonating accounts, setting fees, etc. through [Test Actions](https://viem.sh/docs/actions/test/introduction.html).

```typescript
import hre from "hardhat";

const testClient = await hre.viem.getTestClient();

await testClient.mine({
  blocks: 1000000,
});
```

#### Client options

You can pass options to the `getPublicClient`, `getWalletClient`, and `getTestClient` methods to customize the client's behavior.

```typescript
import hre from "hardhat";

const publicClient = await hre.viem.getPublicClient({
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
import hre from "hardhat";

const contract = await hre.viem.deployContract("contractName", [
  "arg1",
  50,
  "arg3",
]);
```

By default, the first wallet client retrieved by `hre.viem.getWalletClients()` is used to deploy the contract. You can also specify a different wallet client by passing a third parameter, along with other properties, such as `gas` and `value`:

```typescript
import hre from "hardhat";

const [_, secondWalletClient] = await hre.viem.getWalletClients();

const contractA = await hre.viem.deployContract(
  "contractName",
  ["arg1", 50, "arg3"],
  {
    client: { wallet: secondWalletClient }
    gas: 1000000,
    value: parseEther("0.0001"),
    confirmations: 5, // 1 by default
  }
);
```

#### Retrieving an Existing Contract

If the contract is already deployed, you can retrieve an instance of it using the `getContractAt` method:

```typescript
import hre from "hardhat";

const contract = await hre.viem.getContractAt(
  "contractName",
  "0x1234567890123456789012345678901234567890"
);
```

By default, the first wallet client retrieved by `hre.viem.getWalletClients()` will be used for interacting with the contract. If you want to specify a different wallet client, you can do so by passing it as a third parameter, just like when deploying a contract:

```typescript
import hre from "hardhat";

const [_, secondWalletClient] = await hre.viem.getWalletClients();

const contract = await hre.viem.getContractAt(
  "contractName",
  "0x1234567890123456789012345678901234567890",
  { client: { wallet: secondWalletClient } }
);
```

#### Interacting with Contracts

Once you have an instance of a contract, you can interact with it by calling its methods:

```typescript
let response = await contract.read.method1();
await contract.write.method2([10, "arg2"]);
```

##### Send deployment transaction

By default, the `deployContract` method sends a deployment transaction to the blockchain and waits for the transaction to be mined. If you want to send the transaction without waiting for it to be mined, you can do so by using `sendDeploymentTransaction`:

```typescript
import hre from "hardhat";

const { contract: contractName, deploymentTransaction } =
  await hre.viem.sendDeploymentTransaction(
    "contractName",
    ["arg1", 50, "arg3"],
    {
      client: { wallet: secondWalletClient },
      gas: 1000000,
      value: parseEther("0.0001"),
    }
  );
```

Then, if you want to wait for the transaction to be mined, you can do:

```typescript
import hre from "hardhat";

const publicClient = await hre.viem.getPublicClient();
const { contractAddress } = await publicClient.waitForTransactionReceipt({
  hash: deploymentTransaction.hash,
});
```

##### Library linking

Some contracts need to be linked with libraries before they are deployed. You can pass the addresses of their libraries to the `deployContract` and `sendDeploymentTransaction` functions with an object like this:

```typescript
const contractA = await hre.viem.deployContract(
  "contractName",
  ["arg1", 50, "arg3"],
  {
    libraries: {
      ExampleLib: "0x...",
    },
  }
);
```

This allows you to deploy a contract linked to the `ExampleLib` library at the address `"0x..."`.

To deploy a contract, all libraries must be linked. An error will be thrown if any libraries are missing.

#### Using `ContractTypesMap` for easier contract type imports

To simplify importing contract types in `hardhat-viem`, you can use the `ContractTypesMap`. This map contains the contract types of all contracts in your project, indexed by their names.

```typescript
import { ContractTypesMap } from "hardhat/types/artifacts";

const contract: ContractTypesMap["ContractName"];
```

This reduces the need for multiple imports and makes your code cleaner and easier to manage.

## Usage

There are no additional steps you need to take for this plugin to work.

Install it and access Viem through the Hardhat Runtime Environment anywhere you need it (tasks, scripts, tests, etc).

Read the documentation on the [Hardhat Runtime Environment](https://v2.hardhat.org/hardhat-runner/docs/advanced/hardhat-runtime-environment) to learn how to access the HRE in different ways to use Viem from anywhere the HRE is accessible.
