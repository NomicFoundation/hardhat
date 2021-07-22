# Hardhat Network Reference

## Supported hardforks

- byzantium
- constantinople
- petersburg
- istanbul
- muirGlacier
- london

## Config

- Default behavior: Hardhat will automatically run in-process when `defaultNetwork` is empty or set to `hardhat`.

### Mining modes

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

See also [Mining Modes](../explanation/mining-modes.md).

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
- `console.log` output can also be viewed for testnets and mainnet via [Tenderly](https://tenderly.co/).
- `console.log` works by sending static calls to a well-known contract address. At runtime, Hardhat Network detects calls to that address, decodes the input data to the calls, and writes it to the console.

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

### Standard methods

#### `debug_traceTransaction`

Get debug traces of already-mined transactions.

To get a trace, call this method with the hash of the transaction as its argument:

```js
const trace = await hre.network.provider.send("debug_traceTransaction", [
  "0x123...",
]);
```

You can also selectively disable some properties in the list of steps:

```js
const trace = await hre.network.provider.send("debug_traceTransaction", [
  "0x123...",
  {
    disableMemory: true,
    disableStack: true,
    disableStorage: true,
  },
]);
```

##### Known limitations

- You can't trace transactions that use a hardfork older than [Spurious Dragon](https://ethereum.org/en/history/#spurious-dragon)
- The last step of a message is not guaranteed to have a correct value in the `gasCost` property

#### `eth_accounts`

#### `eth_blockNumber`

#### `eth_call`

#### `eth_chainId`

#### `eth_coinbase`

#### `eth_estimateGas`

#### `eth_gasPrice`

#### `eth_getBalance`

#### `eth_getBlockByHash`

#### `eth_getBlockByNumber`

#### `eth_getBlockTransactionCountByHash`

#### `eth_getBlockTransactionCountByNumber`

#### `eth_getCode`

#### `eth_getFilterChanges`

#### `eth_getFilterLogs`

#### `eth_getLogs`

#### `eth_getStorageAt`

#### `eth_getTransactionByBlockHashAndIndex`

#### `eth_getTransactionByBlockNumberAndIndex`

#### `eth_getTransactionByHash`

#### `eth_getTransactionCount`

#### `eth_getTransactionReceipt`

#### `eth_mining`

#### `eth_newBlockFilter`

#### `eth_newFilter`

#### `eth_newPendingTransactionFilter`

#### `eth_pendingTransactions`

#### `eth_sendRawTransaction`

#### `eth_sendTransaction`

#### `eth_sign`

#### `eth_signTypedData_v4`

#### `eth_subscribe`

#### `eth_syncing`

#### `eth_uninstallFilter`

#### `eth_unsubscribe`

#### `net_listening`

#### `net_peerCount`

#### `net_version`

#### `web3_clientVersion`

#### `web3_sha3`

### Hardhat network methods

#### `hardhat_addCompilationResult`

Add information about compiled contracts

#### `hardhat_dropTransaction`

Remove a transaction from the mempool

<!-- intentionally undocumented, internal method:
#### `hardhat_getStackTraceFailuresCount`
-->

#### `hardhat_impersonateAccount`

See the [Mainnet Forking guide](../../guides/mainnet-forking.md)

<!-- intentionally undocumented, internal method:
#### `hardhat_intervalMine`
-->

#### `hardhat_reset`

See the [Mainnet Forking guide](../../guides/mainnet-forking.md)

#### `hardhat_setBalance`

Modifies the balance of an account.

#### `hardhat_setCode`

Modifies the code of an account.

#### `hardhat_setLoggingEnabled`

Enable or disable logging in Hardhat Network

#### `hardhat_setMinGasPrice`

Change the minimum gas price accepted by the network (in wei)

#### `hardhat_setNonce`

Modifies an account's nonce by overwriting it. Throws an `InvalidInputError` if nonce is smaller than the current one. The reason for this restriction is to avoid collisions when deploying contracts using the same nonce more than once.

#### `hardhat_setStorageAt`

Writes a single position of an account's storage. The storage position index must not exceed 2^256, and the value to write must be exactly 32 bytes long.

#### `hardhat_stopImpersonatingAccount`

See the [Mainnet Forking guide](../../guides/mainnet-forking.md)

### Special testing/debugging methods

#### `evm_increaseTime`

Same as Ganache.

#### `evm_mine`

Same as Ganache

#### `evm_revert`

Same as Ganache.

#### `evm_setAutomine`

Enables or disables, based on the single boolean argument, the automatic mining of new blocks with each new transaction submitted to the network. See also [Mining Modes](../explanation/mining-modes.md).

#### `evm_setBlockGasLimit`

#### `evm_setIntervalMining`

Enables (with a numeric argument greater than 0) or disables (with a numeric argument equal to 0), the automatic mining of blocks at a regular interval of milliseconds, each of which will include all pending transactions. See also [Mining Modes](../explanation/mining-modes.md).

#### `evm_setNextBlockTimestamp`

This method works like `evm_increaseTime`, but takes the exact timestamp that you want in the next block, and increases the time accordingly.

#### `evm_snapshot`

Same as Ganache.

### Unsupported methods

#### `eth_compileLLL`

#### `eth_compileSerpent`

#### `eth_compileSolidity`

#### `eth_getCompilers`

#### `eth_getProof`

#### `eth_getUncleByBlockHashAndIndex`

#### `eth_getUncleByBlockNumberAndIndex`

#### `eth_getUncleCountByBlockHash`

#### `eth_getUncleCountByBlockNumber`

#### `eth_getWork`

#### `eth_hashrate`

#### `eth_protocolVersion`

#### `eth_signTransaction`

#### `eth_signTypedData`

#### `eth_signTypedData_v3`

#### `eth_submitHashrate`

#### `eth_submitWork`

## Limitations

### Supported Solidity versions

Hardhat Network can run any smart contract, but it only understands Solidity 0.5.1 and newer.

If you are compiling with an older version of Solidity, or using another language, you can use Hardhat Network, but Solidity stack traces won't be generated.

### Solidity optimizer support

Hardhat Network can work with smart contracts compiled with optimizations, but this may lead to your stack traces' line numbers being a little off.

We recommend compiling without optimizations when testing and debugging your contracts.
