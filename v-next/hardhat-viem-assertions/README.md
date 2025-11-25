# hardhat-viem-assertions

This plugin adds an Ethereum-specific assertions library that integrate with [viem](https://viem.sh/), making your smart contract tests easy to write and read.

## Installation

> This plugin is part of the [Viem Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-viem). If you are using that toolbox, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-viem-assertions
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```ts
import { defineConfig } from "hardhat/config";
import hardhatViemAssertions from "@nomicfoundation/hardhat-viem-assertions";

export default defineConfig({
  plugins: [hardhatViemAssertions],
});
```

## Usage

You don't need to do anything else to use this plugin. The `viem` object added by the [hardhat-viem plugin](https://hardhat.org/plugins/nomicfoundation-hardhat-viem) is expanded with an `assertions` property that contains the assertions library.

Here is an example of using the `balancesHaveChanged` assertion:

```ts
const { viem } = await hre.network.connect();

const [bobWalletClient, aliceWalletClient] = await viem.getWalletClients();

await viem.assertions.balancesHaveChanged(
  bobWalletClient.sendTransaction({
    to: aliceWalletClient.account.address,
    value: 3333333333333333n,
  }),
  [
    {
      address: aliceWalletClient.account.address,
      amount: 3333333333333333n,
    },
  ],
);
```

## Reference

### Reverted transactions

Several assertions are included to check that a transaction reverted, and the reason of the revert.

#### `revert`

Assert that executing a contract function reverts for any reason, without checking the cause of the revert.

Type:

```ts
revert(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
): Promise<void>;
```

Parameters:

- `contractFn`: A promise returned by a viem read or write contract call expected to revert.

Returns:

- A promise that resolves if the assertion passes, or rejects if it fails.

Example:

```ts
await viem.assertions.revert(token.write.transfer([address, 0n]));
```

#### `revertWith`

Assert that executing a contract function reverts with the specified reason string.

Type:

```ts
revertWith(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  expectedRevertReason: string,
): Promise<void>;
```

Parameters:

- `contractFn`: A promise returned by a viem read or write contract call expected to revert.
- `expectedRevertReason`: The expected revert reason string.

Returns:

- A promise that resolves if the assertion passes, or rejects if it fails.

Example:

```ts
await viem.assertions.revertWith(
  token.write.transfer([address, 0n]),
  "transfer value must be positive",
);
```

#### `revertWithCustomError`

Assert that executing a contract function reverts with a specific custom error defined in the given contract.

Type:

```ts
revertWithCustomError(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType,
  customErrorName: string,
): Promise<void>;
```

Parameters:

- `contractFn`: A promise returned by a viem read or write contract call expected to revert.
- `contract`: The viem contract instance whose ABI defines the expected custom error.
- `customErrorName`: The expected custom error name.

Returns:

- A promise that resolves if the assertion passes, or rejects if it fails.

Example:

```ts
await viem.assertions.revertWithCustomError(
  token.write.transfer([address, 0n]),
  token,
  "InvalidTransferValue",
);
```

#### `revertWithCustomErrorWithArgs`

Assert that executing a contract function reverts with a specific custom error and arguments.

Type:

```ts
revertWithCustomErrorWithArgs(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType,
  customErrorName: string,
  args: any[],
): Promise<void>;
```

Parameters:

- `contractFn`: A promise returned by a viem read or write contract call expected to revert.
- `contract`: The viem contract instance whose ABI defines the expected custom error.
- `customErrorName`: The expected custom error name.
- `args`: Expected custom error arguments. Each item can be a concrete value or a predicate function `(value) => boolean`.

Returns:

- A promise that resolves if the assertion passes, or rejects if it fails.

Example:

```ts
await viem.assertions.revertWithCustomErrorWithArgs(
  token.write.transfer([address, 0n]),
  token,
  "InvalidTransferValue",
  [0n],
);
```

This assertion can take predicate functions to match some of the arguments:

```ts
await viem.assertions.revertWithCustomErrorWithArgs(
  contract.read.revertWithCustomErrorWithUintAndString([1n, "test"]),
  contract,
  "CustomErrorWithUintAndString",
  [(arg: bigint) => arg === 1n, "test"],
);
```

```ts
import { anyValue } from "@nomicfoundation/hardhat-toolbox-viem/predicates";

await viem.assertions.revertWithCustomErrorWithArgs(
  contract.read.revertWithCustomErrorWithUintAndString([1n, "test"]),
  contract,
  "CustomErrorWithUintAndString",
  [1n, anyValue],
);
```

### Events

These assertions can be used to check that a transaction emits specific events and their arguments.

#### `emit`

Assert that executing a contract function emits a specific event.

Type:

```ts
emit(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType,
  eventName: string,
): Promise<void>;
```

Parameters:

- `contractFn`: A promise returned by a viem read or write contract call.
- `contract`: The viem contract instance whose ABI is used to parse logs.
- `eventName`: The event name to assert.

Returns:

- A promise that resolves if the assertion passes, or rejects if it fails.

Example:

```ts
await viem.assertions.emit(
  rocketContract.write.launch(),
  rocketContract,
  "LaunchEvent",
);
```

#### `emitWithArgs`

Assert that executing a contract function emits a specific event with the given arguments.

Type:

```ts
emitWithArgs(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType,
  eventName: string,
  args: any[],
): Promise<void>;
```

Parameters:

- `contractFn`: A promise returned by a viem read or write contract call.
- `contract`: The viem contract instance whose ABI is used to parse logs.
- `eventName`: The event name to assert.
- `args`: Expected event arguments. Each item can be a concrete value or a predicate function `(value) => boolean`.

Returns:

- A promise that resolves if the assertion passes, or rejects if it fails.

Example:

```ts
await viem.assertions.emitWithArgs(
  rocketContract.write.launch(),
  rocketContract,
  "LaunchEventWithArgs",
  ["Apollo", "lift-off"],
);
```

This assertion can take predicate functions to match some of the arguments:

```ts
await viem.assertions.emitWithArgs(
  contract.write.emitTwoUints([1n, 2n]),
  contract,
  "WithTwoUintArgs",
  [1n, (arg: bigint) => arg >= 2],
);
```

```ts
import { anyValue } from "@nomicfoundation/hardhat-toolbox-viem/predicates";

await viem.assertions.emitWithArgs(
  contract.write.emitTwoUints([1n, 2n]),
  contract,
  "WithTwoUintArgs",
  [anyValue, 2n],
);
```

### Balance change

These assertions can be used to check how a given transaction affects the ether balance of a specific address.

#### `balancesHaveChanged`

Assert that a transaction changes the ether balance of the given addresses by the specified amounts.

Type:

```ts
balancesHaveChanged(
  resolvedTxHash: Promise<Hash>,
  changes: Array<{
    address: Address;
    amount: bigint;
  }>,
): Promise<void>;
```

Parameters:

- `resolvedTxHash`: A promise that resolves to the transaction hash returned by `sendTransaction`.
- `changes`: The expected balance deltas, in wei, for each address. Negative values are allowed.

Returns:

- A promise that resolves if the assertion passes, or rejects if it fails.

Example:

```ts
await viem.assertions.balancesHaveChanged(
  bobWalletClient.sendTransaction({
    to: aliceWalletClient.account.address,
    value: 3333333333333333n,
  }),
  [
    {
      address: aliceWalletClient.account.address,
      amount: 3333333333333333n,
    },
    {
      address: bobWalletClient.account.address,
      amount: -3333333333333333n,
    },
  ],
);
```
