# hardhat-network-helpers

## Overview

Hardhat Network Helpers provides a convenient JavaScript interface to the JSON-RPC functionality of Hardhat Network.

Hardhat Network exposes its custom functionality primarily through its JSON-RPC API. However, for easy-to-read tests and short scripts, interfacing with the JSON-RPC API is too noisy, requiring a verbose syntax and extensive conversions of both input and output data.

This package provides convenience functions for quick and easy interaction with Hardhat Network. Facilities include the ability to mine blocks up to a certain timestamp or block number, the ability to manipulate attributes of accounts (balance, code, nonce, storage), the ability to impersonate specific accounts, and the ability to take and restore snapshots.

## Installation

> This plugin is part of [Viem Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-viem) and [Ethers+Mocha Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-mocha-ethers). If you are using any of those toolboxes, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-network-helpers
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```ts
import { defineConfig } from "hardhat/config";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";

export default defineConfig({
  plugins: [hardhatNetworkHelpers],
});
```

## Usage

This plugin adds a `networkHelpers` property to each network connection:

```ts
import { network } from "hardhat";

const { networkHelpers } = await network.connect();

// immediately mine a new block
await networkHelpers.mine();

// mines a new block whose timestamp is 60 seconds after the latest block's timestamp.
await networkHelpers.time.increase(60);
```

## Reference

### Table of Contents

- [Mining blocks](#mining-blocks)
  - [`mine`](#mine)
  - [`mineUpTo`](#mineup-to)
- [Manipulating accounts](#manipulating-accounts)
  - [`getStorageAt`](#getstorageat)
  - [`impersonateAccount`](#impersonateaccount)
  - [`setBalance`](#setbalance)
  - [`setCode`](#setcode)
  - [`setNonce`](#setnonce)
  - [`setStorageAt`](#setstorageat)
  - [`stopImpersonatingAccount`](#stopimpersonatingaccount)
- [Snapshots](#snapshots)
  - [`takeSnapshot`](#takesnapshot)
  - [`clearSnapshots`](#clearsnapshots)
- [Fixtures](#fixtures)
  - [`loadFixture`](#loadfixture)
- [Manipulating blocks](#manipulating-blocks)
  - [`dropTransaction`](#droptransaction)
  - [`setBlockGasLimit`](#setblockgaslimit)
  - [`setCoinbase`](#setcoinbase)
  - [`setNextBlockBaseFeePerGas`](#setnextblockbasefeepergas)
  - [`setPrevRandao`](#setprevrandao)
- [Time](#time)
  - [`increase`](#increase)
  - [`increaseTo`](#increaseto)
  - [`latest`](#latest)
  - [`latestBlock`](#latestblock)
  - [`setNextBlockTimestamp`](#setnextblocktimestamp)
- [Duration](#duration)
  - [`years`](#years)
  - [`weeks`](#weeks)
  - [`days`](#days)
  - [`hours`](#hours)
  - [`minutes`](#minutes)
  - [`seconds`](#seconds)
  - [`millis`](#millis)

## Mining blocks

### `mine`

Mines a specified number of blocks with an optional time interval between them.

Type:

```ts
mine(blocks?: NumberLike, options?: { interval?: NumberLike }): Promise<void>
```

Parameters:

- `blocks`: The number of blocks to mine. Defaults to 1 if not specified.
- `options.interval`: Configures the interval (in seconds) between the timestamps of each mined block. Defaults to 1.

Returns: A promise that resolves once the blocks have been mined.

Example:

```ts
// Mine 1 block (default behavior)
const { networkHelpers } = await hre.network.connect();
await networkHelpers.mine();

// Mine 10 blocks with an interval of 60 seconds between each block
const { networkHelpers } = await hre.network.connect();
await networkHelpers.mine(10, { interval: 60 });
```

### `mineUpTo`

Mines new blocks until the latest block number reaches `blockNumber`.

Type:

```ts
mineUpTo(blockNumber: NumberLike): Promise<void>
```

Parameters:

- `blockNumber`: The target block number to mine up to. Must be greater than the latest block's number.

Returns: A promise that resolves once the required blocks have been mined.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
await networkHelpers.mineUpTo(150); // Mines until block with block number 150
```

## Manipulating accounts

### `getStorageAt`

Retrieves the data located at the given address, index, and block number.

Type:

```ts
getStorageAt(address: string, index: NumberLike, block?: NumberLike | BlockTag): Promise<string>
```

Parameters:

- `address`: The address to retrieve storage from.
- `index`: The position in storage.
- `block`: The block number, or one of `"latest"`, `"earliest"`, or `"pending"`. Defaults to `"latest"`.

Returns: A promise that resolves to a string containing the hexadecimal code retrieved.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
const storageData = await networkHelpers.getStorageAt("0x123...", 0);
```

### `impersonateAccount`

Allows Hardhat Network to sign transactions as the given address.

Type:

```ts
impersonateAccount(address: string): Promise<void>
```

Parameters:

- `address`: The address to impersonate.

Returns: A promise that resolves once the account is impersonated.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
await networkHelpers.impersonateAccount("0x123...");
```

### `setBalance`

Sets the balance for the given address.

Type:

```ts
setBalance(address: string, balance: NumberLike): Promise<void>
```

Parameters:

- `address`: The address whose balance will be updated.
- `balance`: The new balance to set for the given address, in wei.

Returns: A promise that resolves once the balance has been set.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
await networkHelpers.setBalance("0x123...", 1000000000000000000n); // Sets 1 ETH
```

### `setCode`

Modifies the bytecode stored at an account's address.

Type:

```ts
setCode(address: string, code: string): Promise<void>
```

Parameters:

- `address`: The address where the given code should be stored.
- `code`: The code to store (as a hex string).

Returns: A promise that resolves once the code is set.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
await networkHelpers.setCode("0x123...", "0x6001600101...");
```

### `setNonce`

Modifies an account's nonce by overwriting it.

Type:

```ts
setNonce(address: string, nonce: NumberLike): Promise<void>
```

Parameters:

- `address`: The address whose nonce is to be changed.
- `nonce`: The new nonce.

Returns: A promise that resolves once the nonce is set.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
await networkHelpers.setNonce("0x123...", 10); // Set the nonce of the account to 10
```

### `setStorageAt`

Writes a single position of an account's storage.

Type:

```ts
setStorageAt(address: string, index: NumberLike, value: NumberLike): Promise<void>
```

Parameters:

- `address`: The address where the code should be stored.
- `index`: The index in storage.
- `value`: The value to store.

Returns: A promise that resolves once the storage value is set.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
await networkHelpers.setStorageAt("0x123...", 0, 0x0000...);
```

### `stopImpersonatingAccount`

Stops Hardhat Network from impersonating the given address.

Type:

```ts
stopImpersonatingAccount(address: string): Promise<void>
```

Parameters:

- `address`: The address to stop impersonating.

Returns: A promise that resolves once the impersonation is stopped.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
await networkHelpers.stopImpersonatingAccount("0x123...");
```

## Snapshots

### `takeSnapshot`

Takes a snapshot of the blockchain state at the current block.

Type:

```ts
takeSnapshot(): Promise<SnapshotRestorer>
```

Returns: A promise that resolves to a `SnapshotRestorer` object, which contains a `restore` method to reset the network to this snapshot.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
const snapshot = await networkHelpers.takeSnapshot();
await snapshot.restore(); // Restores the blockchain state
```

### `clearSnapshots`

Clears every existing snapshot.

Type:

```ts
clearSnapshots(): void
```

Example:

```ts
// Clear all saved snapshots
clearSnapshots();
```

## Fixtures

### `loadFixture`

Executes a fixture function and restores the state to a snapshot on subsequent calls.

The `loadFixture` function is useful in tests where you need to set up the blockchain to a desired state (like deploying contracts, minting tokens, etc.) and then run multiple tests based on that state.

It executes the given fixture function, which should set up the blockchain state, and takes a snapshot of the blockchain. On subsequent calls to `loadFixture` with the same fixture function, the blockchain is restored to that snapshot rather than executing the fixture function again.

The fixture function receives the connection object as its only argument, allowing you to interact with the network.

**Do not pass anonymous functions as the fixture function.** Passing an anonymous function like `loadFixture(async () => { ... })` will bypass the snapshot mechanism and result in the fixture being executed each time. Instead, always pass a named function, like `loadFixture(deployTokens)`.

Type:

```ts
type Fixture<T> = (connection: NetworkConnection) => Promise<T>;

loadFixture(fixture: Fixture<T>): Promise<T>
```

Parameters:

- `fixture`: A named asynchronous function that sets up the desired blockchain state and returns the fixture's data.

Returns: A promise that resolves to the data returned by the fixture, either from execution or a restored snapshot.

Example:

```ts
async function setupContracts({ viem }: NetworkConnection) {
  const contractA = await viem.deployContract("ContractA");
  const contractB = await viem.deployContract("ContractB");
  return { contractA, contractB };
}

const { contractA, contractB } = await loadFixture(setupContracts);
```

## Manipulating blocks

### `dropTransaction`

Removes the given transaction from the mempool, if it exists.

Type:

```ts
dropTransaction(txHash: string): Promise<boolean>
```

Parameters:

- `txHash`: Transaction hash to be removed from the mempool.

Returns: `true` if successful, otherwise `false`.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
const success = await networkHelpers.dropTransaction("0x123...");
```

### `setBlockGasLimit`

Sets the gas limit for future blocks.

Type:

```ts
setBlockGasLimit(blockGasLimit: NumberLike): Promise<void>
```

Parameters:

- `blockGasLimit`: The gas limit to set for future blocks.

Returns: A promise that resolves once the gas limit has been set.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
await networkHelpers.setBlockGasLimit(1000000); // Set block gas limit to 1,000,000
```

### `setCoinbase`

Sets the coinbase address to be used in new blocks.

Type:

```ts
setCoinbase(address: string): Promise<void>
```

Parameters:

- `address`: The new coinbase address.

Returns: A promise that resolves once the coinbase address has been set.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
await networkHelpers.setCoinbase("0x123...");
```

### `setNextBlockBaseFeePerGas`

Sets the base fee of the next block.

Type:

```ts
setNextBlockBaseFeePerGas(baseFeePerGas: NumberLike): Promise<void>
```

Parameters:

- `baseFeePerGas`: The new base fee to use.

Returns: A promise that resolves once the base fee is set.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
await networkHelpers.setNextBlockBaseFeePerGas(1000000); // Set base fee to 1,000,000
```

### `setPrevRandao`

Sets the PREVRANDAO value of the next block.

Type:

```ts
setPrevRandao(prevRandao: NumberLike): Promise<void>
```

Parameters:

- `prevRandao`: The new PREVRANDAO value to use.

Returns: A promise that resolves once the PREVRANDAO value is set.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
await networkHelpers.setPrevRandao(123456789); // Set the PREVRANDAO value
```

## Time

### `increase`

Mines a new block whose timestamp is `amountInSeconds` after the latest block's timestamp.

Type:

```ts
increase(amountInSeconds: NumberLike): Promise<number>
```

Parameters:

- `amountInSeconds`: Number of seconds to increase the next block's timestamp by.

Returns: A promise that resolves to the timestamp of the mined block.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
await networkHelpers.time.increase(12);
```

### `increaseTo`

Mines a new block whose timestamp is `timestamp`.

Type:

```ts
increaseTo(timestamp: NumberLike | Date): Promise<void>
```

Parameters:

- `timestamp`: Can be `Date` or Epoch seconds. Must be greater than the latest block's timestamp.

Returns: A promise that resolves when the block is successfully mined.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
networkHelpers.time.increaseTo(1700000000);
```

### `latest`

Retrieves the timestamp of the latest block.

Type:

```ts
latest(): Promise<number>
```

Returns: The timestamp of the latest block.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
const timestamp = await networkHelpers.time.latest();
```

### `latestBlock`

Retrieves the latest block number.

Type:

```ts
latestBlock(): Promise<number>
```

Returns: A promise that resolves to the latest block number.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
const blockNumber = await networkHelpers.time.latestBlock();
```

### `setNextBlockTimestamp`

Sets the timestamp of the next block but doesn't mine one.

Type:

```ts
setNextBlockTimestamp(timestamp: NumberLike | Date): Promise<void>
```

Parameters:

- `timestamp`: Can be `Date` or Epoch seconds. Must be greater than the latest block's timestamp.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
networkHelpers.time.setNextBlockTimestamp(1700000000);
```

## Duration

### `years`

Converts the given number of years into seconds.

Type:

```ts
years(n: number): number
```

Parameters:

- `n`: The number of years.

Returns: The equivalent duration in seconds.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
const seconds = networkHelpers.time.duration.years(1);
```

### `weeks`

Converts the given number of weeks into seconds.

Type:

```ts
weeks(n: number): number
```

Parameters:

- `n`: The number of weeks.

Returns: The equivalent duration in seconds.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
const seconds = networkHelpers.time.duration.weeks(1);
```

### `days`

Converts the given number of days into seconds.

Type:

```ts
days(n: number): number
```

Parameters:

- `n`: The number of days.

Returns: The equivalent duration in seconds.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
const seconds = networkHelpers.time.duration.days(1);
```

### `hours`

Converts the given number of hours into seconds.

Type:

```ts
hours(n: number): number
```

Parameters:

- `n`: The number of hours.

Returns: The equivalent duration in seconds.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
const seconds = networkHelpers.time.duration.hours(1);
```

### `minutes`

Converts the given number of minutes into seconds.

Type:

```ts
minutes(n: number): number
```

Parameters:

- `n`: The number of minutes.

Returns: The equivalent duration in seconds.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
const seconds = networkHelpers.time.duration.minutes(1);
```

### `seconds`

Converts the given number of seconds into seconds.

Type:

```ts
seconds(n: number): number
```

Parameters:

- `n`: The number of seconds.

Returns: The same number of seconds.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
const seconds = networkHelpers.time.duration.seconds(1);
```

### `millis`

Converts the given number of milliseconds into seconds, rounded down to the nearest whole number.

Type:

```ts
millis(n: number): number
```

Parameters:

- `n`: The number of milliseconds.

Returns: The equivalent duration in seconds.

Example:

```ts
const { networkHelpers } = await hre.network.connect();
const seconds = networkHelpers.time.duration.millis(1500); // Returns 1
```
