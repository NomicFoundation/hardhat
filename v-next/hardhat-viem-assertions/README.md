# hardhat-viem-assertions

This plugin adds an Ethereum-specific assertions library that integrate with [viem](https://viem.sh/), making your smart contract tests easy to write and read.

## Installation

> This plugin is part of the [Viem Hardhat Toolbox](/v-next/hardhat-toolbox-viem/). If you are using that toolbox, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-viem-assertions
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```ts
import hardhatViemAssertions from "@nomicfoundation/hardhat-viem-assertions";

export default {
  plugins: [hardhatViemAssertions],
};
```

## Usage

You don't need to do anything else to use this plugin. The `viem` object added by the [hardhat-viem plugin](/v-next/hardhat-viem/) is expanded with an `assertions` property that contains the assertions library.

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

#### `.revert`

Assert that a transaction reverted for any reason, without checking the cause of the revert:

```ts
await viem.assertions.revert(token.write.transfer([address, 0n]));
```

#### `.revertWith`

Assert that a transaction reverted with a specific reason string:

```ts
await viem.assertions.revertWith(
  token.write.transfer([address, 0n]),
  "transfer value must be positive",
);
```

#### `.revertWithCustomError`

Assert that a transaction reverted with a specific custom error:

```ts
await viem.assertions.revertWithCustomError(
  token.write.transfer([address, 0n]),
  token,
  "InvalidTransferValue",
);
```

The second argument must be the contract that defines the error. The contract is used to determine the full signature of the expected error. The assertion does not check whether the error was emitted by the contract.

#### `.revertWithCustomErrorWithArgs`

Assert that a transaction reverted with a custom error and specific arguments:

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

#### `.emit`

Assert that a transaction emits a specific event:

```ts
await viem.assertions.emit(
  rocketContract.write.launch(),
  rocketContract,
  "LaunchEvent",
);
```

#### `.emitWithArgs`

Assert that a transaction emits an event with specific arguments:

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

#### `.balancesHaveChanged`

Assert that a transaction changes the balance of specific addresses:

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
