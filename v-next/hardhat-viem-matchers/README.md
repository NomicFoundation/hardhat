# Hardhat Viem Matchers plugin

This plugin adds an Ethereum-specific matchers assertion library that integrate with [viem](https://viem.sh/), making your smart contract tests easy to write and read.

## Installation

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-viem-matchers@next
```

and add the following statements to your `hardhat.config.ts` file:

```typescript
// ...
import viemMatchersPlugin from "@nomicfoundation/hardhat-viem-matchers";

// ...

export default {
  // ...
  plugins: [
    // ...
    viemMatchersPlugin,
  ],

  // ...
};
```

## Usage

You don't need to do anything else to use this plugin. Whenever you run your tests with Hardhat, it will automatically add the matchers to the `viem` object.

Here is an example of using the `balancesHaveChanged` matcher:

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

Several matchers are included to assert that a transaction reverted, and the reason of the revert.

#### `.revert`

Assert that a transaction reverted for any reason, without checking the cause of the revert:

```ts
revert(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
): Promise<void>;
```

#### `.revertWith`

Assert that a transaction reverted with a specific reason string:

```ts
revertWith(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  expectedRevertReason: string,
): Promise<void>;
```

You can also use regular expressions:

```ts
xxxx;
```

#### `.revertWithCustomError`

Assert that a transaction reverted with a specific custom error:

```ts
revertWithCustomError<ContractName extends CompiledContractName>(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType<ContractName>,
  customErrorName: string,
): Promise<void>;
```

The first argument must be the contract that defines the error. The contract is used to determine the full signature of the expected error. The matcher does not check whether the error was emitted by the contract.

If the error has arguments, the .withArgs matcher can be added:

xxx

#### `.revertWithCustomErrorWithArgs`

Assert that a transaction reverted with a custom error and specific arguments:

```ts
revertWithCustomErrorWithArgs<ContractName extends CompiledContractName>(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType<ContractName>,
  customErrorName: string,
  args: any[],
): Promise<void>;
```

### Events

#### `.emit`

Assert that a transaction emits a specific event:

```ts
emit<
  ContractName extends CompiledContractName,
  EventName extends ContractName extends keyof ContractAbis
    ? ContractEventName<ContractAbis[ContractName]>
    : string,
>(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType<ContractName>,
  eventName: EventName,
): Promise<void>;
```

#### `.emitWithArgs`

Assert that a transaction emits an event with specific arguments:

```ts
emitWithArgs<
  ContractName extends CompiledContractName,
  EventName extends ContractName extends keyof ContractAbis
    ? ContractEventName<ContractAbis[ContractName]>
    : string,
>(
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType<ContractName>,
  eventName: EventName,
  args: any[],
): Promise<void>;
```

### Balance change

These matchers can be used to assert how a given transaction affects the ether balance of a specific address.

#### `.balancesHaveChanged`

Assert that a transaction changes the balance of specific addresses:

```ts
balancesHaveChanged: (
  resolvedTxHash: Promise<Hash>,
  changes: Array<{
    address: Address;
    amount: bigint;
  }>,
) => Promise<void>;
```
