# Hardhat Network Reference

- It supports the following hardforks:
  - byzantium
  - constantinople
  - petersburg
  - istanbul
  - muirGlacier

## Config

- Default behavior: Hardhat will automatically run in-process when `defaultNetwork` is empty or set to `hardhat`.

### Mining modes

<!-- TODO: add a link to the explanation of mining modes -->

You can configure the mining behavior under your Hardhat Network settings:

```js
networks: {
  hardhat: {
    mining: {
      auto: false,
      interval: 5000
    }
  }
}
```

In this example, automining is disabled and interval mining is set so that a new block is generated every 5 seconds. You can also configure interval mining to generate a new block after a random delay:

```js
networks: {
  hardhat: {
    mining: {
      auto: false,
      interval: [3000, 6000]
    }
  }
}
```

In this case, a new block will be mined after a random delay of between 3 and 6 seconds. For example, the first block could be mined after 4 seconds, the second block 5.5 seconds after that, and so on.

#### Manual mining

You can disable both mining modes like this:

```js
networks: {
  hardhat: {
    mining: {
      auto: false,
      interval: 0
    }
  }
}
```

This means that no new blocks will be mined by the Hardhat Network, but you can manually mine new blocks using the `evm_mine` RPC method. This will generate a new block that will include as many pending transactions as possible.

### Mempool behavior

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

### Removing and replacing transactions

Transactions in the mempool can be removed using the `hardhat_dropTransaction` method:

```js
const txHash = "0xabc...";
await network.provider.send("hardhat_dropTransaction", [txHash]);
```

You can also replace a transaction by sending a new one with the same nonce as the one that it's already in the mempool but with a higher gas price. Keep in mind that, like in Geth, for this to work the new gas price has to be at least 10% higher than the gas price of the current transaction.

### Configuring mining modes using RPC methods

You can change the mining behavior on runtime using two RPC methods: `evm_setAutomine` and `evm_setIntervalMining`. For example, to disable automining:

```js
await network.provider.send("evm_setAutomine", [false]);
```

And to enable interval mining:

```js
await network.provider.send("evm_setIntervalMining", [5000]);
```

## `console.log`
- You can use it in calls and transactions. It works with `view` functions, but not in `pure` ones.
- It always works, regardless of the call or transaction failing or being successful.
- To use it you need to import `hardhat/console.sol`.
- You can call `console.log` with up to 4 parameters in any order of following types:
  - `uint`
  - `string`
  - `bool`
  - `address`
- There's also the single parameter API for the types above, and additionally `bytes`, `bytes1`... up to `bytes32`:
  - `console.logInt(int i)`
  - `console.logUint(uint i)`
  - `console.logString(string memory s)`
  - `console.logBool(bool b)`
  - `console.logAddress(address a)`
  - `console.logBytes(bytes memory b)`
  - `console.logBytes1(bytes1 b)`
  - `console.logBytes2(bytes2 b)`
  - ...
  - `console.logBytes32(bytes32 b)`
- `console.log` implements the same formatting options that can be found in Node.js' [`console.log`](https://nodejs.org/dist/latest-v12.x/docs/api/console.html#console_console_log_data_args), which in turn uses [`util.format`](https://nodejs.org/dist/latest-v12.x/docs/api/util.html#util_util_format_format_args).
  - Example: `console.log("Changing owner from %s to %s", currentOwner, newOwner)`
- `console.log` is implemented in standard Solidity and then detected in Hardhat Network. This makes its compilation work with any other tools (like Remix, Waffle or Truffle).
- `console.log` calls can run in other networks, like mainnet, kovan, ropsten, etc. They do nothing in those networks, but do spend a minimal amount of gas.

## Initial State

Hardhat Network is initialized by default in this state:

- A brand new blockchain, just with the genesis block.
- 20 accounts with 10000 ETH each, generated with the mnemonic `"test test test test test test test test test test test junk"`. Their addresses are:
  - `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
  - `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
  - `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
  - `0x90F79bf6EB2c4f870365E785982E1f101E93b906`
  - `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65`
  - `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc`
  - `0x976EA74026E726554dB657fA54763abd0C3a0aa9`
  - `0x14dC79964da2C08b23698B3D3cc7Ca32193d9955`
  - `0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f`
  - `0xa0Ee7A142d267C1f36714E4a8F75612F20a79720`
  - `0xBcd4042DE499D14e55001CcbB24a551F3b954096`
  - `0x71bE63f3384f5fb98995898A86B02Fb2426c5788`
  - `0xFABB0ac9d68B0B445fB7357272Ff202C5651694a`
  - `0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec`
  - `0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097`
  - `0xcd3B766CCDd6AE721141F452C550Ca635964ce71`
  - `0x2546BcD3c84621e976D8185a91A922aE77ECEc30`
  - `0xbDA5747bFD65F08deb54cb465eB87D40e51B197E`
  - `0xdD2FD4581271e230360230F9337D5c0430Bf44C0`
  - `0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199`

To customise it, take a look at [the configuration section](/config/README.md#hardhat-network).

## JSON-RPC methods support

### Supported methods

- `eth_accounts`
- `eth_blockNumber`
- `eth_call`
- `eth_chainId`
- `eth_coinbase`
- `eth_estimateGas`
- `eth_gasPrice`
- `eth_getBalance`
- `eth_getBlockByHash`
- `eth_getBlockByNumber`
- `eth_getBlockTransactionCountByHash`
- `eth_getBlockTransactionCountByNumber`
- `eth_getCode`
- `eth_getFilterChanges`
- `eth_getFilterLogs`
- `eth_getLogs`
- `eth_getStorageAt`
- `eth_getTransactionByBlockHashAndIndex`
- `eth_getTransactionByBlockNumberAndIndex`
- `eth_getTransactionByHash`
- `eth_getTransactionCount`
- `eth_getTransactionReceipt`
- `eth_mining`
- `eth_newBlockFilter`
- `eth_newFilter`
- `eth_newPendingTransactionFilter`
- `eth_pendingTransactions`
- `eth_sendRawTransaction`
- `eth_sendTransaction`
- `eth_signTypedData_v4`
- `eth_sign`
- `eth_subscribe`
- `eth_syncing`
- `eth_uninstallFilter`
- `eth_unsubscribe`
- `net_listening`
- `net_peerCount`
- `net_version`
- `web3_clientVersion`
- `web3_sha3`

#### Hardhat network methods

- `hardhat_addCompilationResult` – Add information about compiled contracts
- `hardhat_dropTransaction` – Remove a transaction from the mempool
- `hardhat_impersonateAccount` – see the [Mainnet Forking guide](../guides/mainnet-forking.md)
- `hardhat_reset` – see the [Mainnet Forking guide](../guides/mainnet-forking.md)
- `hardhat_setBalance` – Modifies the balance of an account.
- `hardhat_setCode` – Modifies the code of an account.
- `hardhat_setLoggingEnabled` – Enable or disable logging in Hardhat Network
- `hardhat_setMinGasPrice` - change the minimum gas price accepted by the network (in wei)
- `hardhat_setNonce` – Modifies an account's nonce by overwriting it. Throws an InvalidInputError if nonce is smaller than the current one. The reason for this restriction is to avoid collisions when deploying contracts using the same nonce more than once.
- `hardhat_setStorageAt` – Writes a single position of an account's storage. The storage position index must not exceed 2^256, and the value to write must be exactly 32 bytes long.
- `hardhat_stopImpersonatingAccount` – see the [Mainnet Forking guide](../guides/mainnet-forking.md)

#### Special testing/debugging methods

- `evm_increaseTime` – same as Ganache.
- `evm_mine` – same as Ganache
- `evm_revert` – same as Ganache.
- `evm_snapshot` – same as Ganache.
- `evm_setNextBlockTimestamp` - this method works like `evm_increaseTime`, but takes the exact timestamp that you want in the next block, and increases the time accordingly.

### Unsupported methods

- `eth_compileLLL`
- `eth_compileSerpent`
- `eth_compileSolidity`
- `eth_getCompilers`
- `eth_getProof`
- `eth_getUncleByBlockHashAndIndex`
- `eth_getUncleByBlockNumberAndIndex`
- `eth_getUncleCountByBlockHash`
- `eth_getUncleCountByBlockNumber`
- `eth_getWork`
- `eth_hashrate`
- `eth_protocolVersion`
- `eth_signTransaction`
- `eth_submitHashrate`
- `eth_submitWork`
