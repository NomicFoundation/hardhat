# Reference

This is the reference for the Hardhat Network Helpers library. This library contains utility functions to interact with the Hardhat Network in an easier and safer way.

## Mining blocks

### `mine([blocks], [options])`

Mines a specified number of blocks at a given interval.

Parameters:

- `blocks`: Number of blocks to mine. Defaults to 1.
- `options.interval`: Configures the interval (in seconds) between the timestamps of each mined block. Defaults to 1.

Example:

```ts
// mine a new block
await helpers.mine();

// mine several blocks
await helpers.mine(1000);

// mine several blocks with a given interval between their timestamps
await helpers.mine(1000, { interval: 15 });
```

### `mineUpTo(blockNumber)`

Mines new blocks until the latest block number is `blockNumber`.

Parameters:

- `blockNumber`: Must be greater than the latest block's number.

Example:

```ts
await helpers.mineUpTo(1234);
```

## Manipulating accounts

### `setBalance(address, balance)`

Sets the balance for the given address.

Parameters:

- `address`: The address whose balance will be edited.
- `balance`: The new balance to set for the given address, in wei.

Example:

```ts
await helpers.setBalance(address, 100n ** 18n);
```

### `setCode(address, code)`

Modifies the contract bytecode stored at an account's address.

Parameters:

- `address`: The address where the given code should be stored.
- `code`: The code to store.

Example:

```ts
await helpers.setCode(address, "0x1234...");
```

### `setNonce(address, nonce)`

Modifies an account's nonce by overwriting it.

Parameters:

- `address`: The address whose nonce is to be changed.
- `nonce`: The new nonce.

Example:

```ts
await helpers.setNonce(address, 100);
```

### `setStorageAt(address, index, value)`

Writes a single position of an account's storage.

Parameters:

- `address`: The address where the code should be stored.
- `index`: The index in storage.
- `value`: The value to store.

Example:

```ts
await helpers.setStorageAt(address, storageSlot, newValue);
```

### `getStorageAt(address, index, [block])`

Retrieves the data located at the given address, index, and block number.

Parameters:

- `address`: The address to retrieve storage from.
- `index`: The position in storage.
- `block`: The block number, or one of `"latest"`, `"earliest"`, or `"pending"`. Defaults to `"latest"`.

Returns: A string containing the hexadecimal value retrieved.

Example:

```ts
await helpers.getStorageAt(address, storageSlot);
```

### `impersonateAccount(address)`

Allows Hardhat Network to sign subsequent transactions as the given address.

Parameters:

- `address`: The address to impersonate.

Example:

```ts
await helpers.impersonateAccount(address);
```

### `stopImpersonatingAccount(address)`

Stops Hardhat Network from impersonating the given address.

Parameters:

- `address`: The address to stop impersonating.

Example:

```ts
await helpers.stopImpersonatingAccount(address);
```

## Time helpers

### `latest()`

Returns the timestamp of the latest block.

Example:

```ts
await helpers.time.latest();
```

### `latestBlock()`

Returns the number of the latest block.

Example:

```ts
await helpers.time.latestBlock();
```

### `increase(amountInSeconds)`

Mines a new block whose timestamp is `amountInSeconds` after the latest block's timestamp.

Parameters:

- `amountInSeconds`: Number of seconds to increase the next block's timestamp by.

Returns: The timestamp of the mined block.

Example:

```ts
// advance time by one hour and mine a new block
await helpers.time.increase(3600);
```

### `increaseTo(timestamp)`

Mines a new block whose timestamp is `timestamp`.

Parameters:

- `timestamp`: Must be bigger than the latest block's timestamp.

Example:

```ts
await helpers.time.increaseTo(newTimestamp);
```

### `setNextBlockTimestamp(timestamp)`

Sets the timestamp of the next block but doesn't mine one.

Parameters:

- `timestamp`: Can be `Date` or [Epoch seconds](https://en.wikipedia.org/wiki/Unix_time). Must be greater than the latest block's timestamp.

Example:

```ts
// set the timestamp of the next block but don't mine a new block
await helpers.time.setNextBlockTimestamp(newTimestamp);
```

## Snapshots

### `takeSnapshot()`

Takes a snapshot of the state of the blockchain at the current block.

Returns: An object with a `restore` method that can be used to reset the network to the state in the snapshot.

Example:

```ts
// take a snapshot of the current state of the blockchain
const snapshot = await helpers.takeSnapshot();

// after doing some changes, you can restore to the state of the snapshot
await snapshot.restore();
```

## Fixtures

### `loadFixture()`

Useful in tests for setting up the desired state of the network.

Executes the given function and takes a snapshot of the blockchain. Upon subsequent calls to `loadFixture` with the same function, rather than executing the function again, the blockchain will be restored to that snapshot.

_Warning_: don't use `loadFixture` with an anonymous function, otherwise the function will be executed each time instead of using snapshots:

- Correct usage: `loadFixture(deployTokens)`
- Incorrect usage: `loadFixture(async () => { ... })`

Parameters:

- `fixture`: The function that will be used to set up the fixture.

Example:

```ts
async function deployContractsFixture() {
  const token = await Token.deploy(...);
  const exchange = await Exchange.deploy(...);

  return { token, exchange };
}

it("test", async function () {
  const { token, exchange } = await loadFixture(deployContractsFixture);

  // use token and exchanges contracts
})
```

## Other helpers

### `dropTransaction(txHash)`

Removes the given transaction from the mempool, if it exists.

Parameters:

- `txHash`: Transaction hash to be removed from the mempool.

Returns: `true` if successful, otherwise `false`.

Throws: if the transaction was already mined.

Example:

```ts
await helpers.dropTransaction(
  "0x1010101010101010101010101010101010101010101010101010101010101010"
);
```

### `setNextBlockBaseFeePerGas(baseFeePerGas)`

Sets the base fee of the next block.

Parameters:

- `baseFeePerGas`: The new base fee to use.

### `setPrevRandao(prevRandao)`

Sets the PREVRANDAO value of the next block.

Parameters:

- `prevRandao`: The new PREVRANDAO value to use.

### `reset([url], [blockNumber])`

Resets the Hardhat Network. The result of calling this method depends on which arguments are provided:

- If a `url` and a `blockNumber` are passed, the network will be reset to a forked state using that URL and block number.
- If no `blockNumber` is provided, the network will be reset to a forked state using the latest block number that can be forked with a low probability of being reorged.
- If the function is called without arguments, the network will be reset to a local, non-forked state.
