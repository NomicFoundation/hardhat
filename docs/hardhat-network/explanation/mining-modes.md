# Mining Modes

Hardhat Network can be configured to **automine** blocks, immediately upon receiving each transaction, or it can be configured for **interval mining**, where a new block is mined periodically, incorporating as many pending transactions as possible.

You can use one of these modes, both or neither. By default, only the automine mode is enabled.

When automine is disabled, every sent transaction is added to the mempool, which contains all the transactions that could be mined in the future. Hardhat Network's mempool follows the same rules as geth. This means, among other things, that transactions are prioritized by fees paid to the miner (and then by arrival time), and that invalid transactions are dropped. Pending transactions can be queried via the `eth_getBlockByNumber` RPC method (with `"pending"` as the block number argument), they can be removed using the `hardhat_dropTransaction` RPC method, and they can be replaced by submitting a new transaction with the same nonce but with a 10+% increase in fees paid to the miner.

If neither mining mode is enabled, no new blocks will be mined, but you can manually mine new blocks using the `evm_mine` RPC method. This will generate a new block that will include as many pending transactions as possible.

## Mempool behavior

When automine is disabled, every sent transaction is added to the mempool, which contains all the transactions that could be mined in the future. Hardhat Network's mempool follows the same rules as geth. This means, among other things, that:

- Transactions with a higher gas price are included first
- If two transactions can be included and both have the same gas price, the one that was received first is included first
- If a transaction is invalid (for example, its nonce is lower than the nonce of the address that sent it), the transaction is dropped.

You can get the list of pending transactions that will be included in the next block by using the "pending" block tag:

```js
const pendingBlock = await network.provider.send("eth_getBlockByNumber", [
  "pending",
  false,
]);
```

## Removing and replacing transactions

Transactions in the mempool can be removed using the `hardhat_dropTransaction` method:

```js
const txHash = "0xabc...";
await network.provider.send("hardhat_dropTransaction", [txHash]);
```

You can also replace a transaction by sending a new one with the same nonce as the one that it's already in the mempool but with a higher gas price. Keep in mind that, like in Geth, for this to work the new gas price has to be at least 10% higher than the gas price of the current transaction.

## Configuring Mining Modes

See [the Mining Modes configuration reference](../reference/README.md#mining-modes) to understand what to put in your Hardhat config file.

### Using RPC methods

You can change the mining behavior at runtime using two RPC methods: `evm_setAutomine` and `evm_setIntervalMining`. For example, to disable automining:

```js
await network.provider.send("evm_setAutomine", [false]);
```

And to enable interval mining:

```js
await network.provider.send("evm_setIntervalMining", [5000]);
```
