# Buidler EVM

Buidler comes built-in with Buidler EVM, a local Ethereum network designed for development. It allows you to deploy your contracts, run your tests and debug your code.

## How does it work?

- It mines a block with each transaction that it receives, in order and with no delay.
- It's backed by the `ethereumjs-vm` EVM implementation, the same one used by ganache, Remix and Ethereum Studio.
- It supports the following hardforks:
  - byzantium
  - constantinople
  - petersburg
  - istanbul

## How can I use it?

- Buidler will always spin up an instance on startup when `defaultNetwork` is empty or set to `buidlerevm`. It's the default behavior.
- It can be used to run tests, in the console, scripts, and tasks
- Plugins (web3.js, ethers.js, Truffle, etc) connect directly to the provider
- There's no need to make any changes to your tests or scripts.
- It's simply another network and it can be used with `--network`

## Connecting to Buidler EVM from wallets and other software

Buidler EVM can be run as a server or testing node. To do this, you just need to run

```sh
npx buidler node
```

It will start Buidler EVM, and expose it as a JSON-RPC and WebSocket server.

Then, just connect your wallet or application to `http://localhost:8545`.

If you want to connect Buidler to this node, you only need to run it using `--network localhost`.

## Solidity stack traces

Buidler EVM has first-class Solidity support. It always knows which
smart contracts are being run, what they do exactly and why they fail.

If a transaction or call fails, Buidler EVM will throw an exception.
This exception will have a combined JavaScript and Solidity stack
trace: stack traces that start in JavaScript/TypeScript up to your
call to the contract, and continue with the full Solidity call stack.

This is an example of a Buidler EVM exception:

```
Error: Transaction reverted: function selector was not recognized and there's no fallback function
  at ERC721Mock.<unrecognized-selector> (contracts/mocks/ERC721Mock.sol:9)
  at ERC721Mock._checkOnERC721Received (contracts/token/ERC721/ERC721.sol:334)
  at ERC721Mock._safeTransferFrom (contracts/token/ERC721/ERC721.sol:196)
  at ERC721Mock.safeTransferFrom (contracts/token/ERC721/ERC721.sol:179)
  at ERC721Mock.safeTransferFrom (contracts/token/ERC721/ERC721.sol:162)
  at TruffleContract.safeTransferFrom (node_modules/@nomiclabs/truffle-contract/lib/execute.js:157:24)
  at Context.<anonymous> (test/token/ERC721/ERC721.behavior.js:321:26)
```

The last two lines correspond to the JavaScript test code that executed a
failing transaction. The rest is the Solidity stack trace.
This way you know exactly why your tests aren't passing.

## Automatic error messages

Buidler EVM always knows why your transaction or call failed, and uses this
information to make debugging your contracts easier.

When a transaction fails without a reason, Buidler EVM will create a clear
error message in the following cases:

- Calling a non-payable function with ETH

- Sending ETH to a contract without a payable fallback function

- Calling a non-existent function when there's no fallback function

- Calling a function with incorrect parameters

- Calling an external function that doesn't return the right amount of data

- Calling an external function on a non-contract account

- Failing to execute an external call because of its parameters (e.g. trying to send too much ETH)

- Calling a library without `DELEGATECALL`

- Incorrectly calling a precompiled contract

## `console.log`

Buidler EVM allows you to print logging messages and contract variables calling `console.log()` from your Solidity code. You can see an example in the Sample Project. Follow the steps in [Quick Start](/getting-started/#quick-start) to try it out.

- You can use it in calls and transactions. It works with `view` functions, but not in `pure` ones.
- It always works, regardless of the call or transaction failing or being successful.
- To use it you need to import `@nomiclabs/buidler/console.sol`.
- It works with Solidity 0.5.x and 0.6.x.
- You can call `console.log` with up to 4 parameters in any order of following types:
  - `uint`
  - `string`
  - `bool`
  - `address`
- There's also the single parameter API for the types above, and additionally `bytes`, `bytes1`.. up to `bytes32`:
  - `console.logInt(int i)`
  - `console.logUint(uint i)`
  - `console.logString(string memory s)`
  - `console.logBool(bool b)`
  - `console.logAddress(address a)`
  - `console.logBytes(bytes memory b)`
  - `console.logByte(byte b)`
  - `console.logBytes1(bytes1 b)`
  - `console.logBytes2(bytes2 b)`
  - ...
  - `console.logBytes32(bytes32 b)`
- `console.log` implements the same formatting options that can be found in Node.js' [`console.log`](https://nodejs.org/dist/latest-v12.x/docs/api/console.html#console_console_log_data_args), which in turn uses [`util.format`](https://nodejs.org/dist/latest-v12.x/docs/api/util.html#util_util_format_format_args).
  - Example: `console.log("Changing owner from %s to %s", currentOwner, newOwner)`
- It works with any library: web3.js, ethers.js, truffle-contract, waffle, etc.
- `console.log` is implemented in standard Solidity and then detected in Buidler EVM. This makes its compilation work with any other tools (like Remix or Truffle).
- `console.log` calls can run in other networks, like mainnet, kovan, ropsten, etc. They do nothing in those networks, but spend a minimal amount of gas.

## Logging

Buidler EVM uses its tracing infrastructure to offer rich logging that will help
you develop and debug smart contracts.

For example, a successful transaction and a failed call would look like this:

```sh
eth_sendTransaction
  Contract deployment: Greeter
  Contract address: 0x8858eeb3dfffa017d4bce9801d340d36cf895ccf
  Transaction: 0x7ea2754e53f09508d42bd3074046f90595bedd61fcdf75a4764453454733add0
  From: 0xc783df8a850f42e7f7e57013759c285caa701eb6
  Value: 0 ETH
  Gas used: 568851 of 2844255
  Block: #2 - Hash: 0x4847b316b12170c576999183da927c2f2056aa7d8f49f6e87430e6654a56dab0

  console.log:
    Deploying a Greeter with greeting: Hello, world!

eth_call
  Contract call: Greeter#greet
  From: 0xc783df8a850f42e7f7e57013759c285caa701eb6

  Error: VM Exception while processing transaction: revert Not feeling like it
      at Greeter.greet (contracts/Greeter.sol:14)
      at process._tickCallback (internal/process/next_tick.js:68:7)
```

This logging is enabled by default when using Buidler EVM's node (i.e. `npx buidler node`), but disabled when using
the in-process Buidler EVM provider. See [Buidler EVM's config](../config/README.md#buidler-evm-network) enabled it in both.

## Buidler EVM initial state

Buidler EVM is initialized by default in this state:

- A brand new blockchain, just with the genesis block.
- 20 accounts with 10000 ETH each
  - `0xc783df8a850f42e7f7e57013759c285caa701eb6`
  - `0xead9c93b79ae7c1591b1fb5323bd777e86e150d4`
  - `0xe5904695748fe4a84b40b3fc79de2277660bd1d3`
  - `0x92561f28ec438ee9831d00d1d59fbdc981b762b2`
  - `0x2ffd013aaa7b5a7da93336c2251075202b33fb2b`
  - `0x9fc9c2dfba3b6cf204c37a5f690619772b926e39`
  - `0xfbc51a9582d031f2ceaad3959256596c5d3a5468`
  - `0x84fae3d3cba24a97817b2a18c2421d462dbbce9f`
  - `0xfa3bdc8709226da0da13a4d904c8b66f16c3c8ba`
  - `0x6c365935ca8710200c7595f0a72eb6023a7706cd`
  - `0xd7de703d9bbc4602242d0f3149e5ffcd30eb3adf`
  - `0x532792b73c0c6e7565912e7039c59986f7e1dd1f`
  - `0xea960515f8b4c237730f028cbacf0a28e7f45de0`
  - `0x3d91185a02774c70287f6c74dd26d13dfb58ff16`
  - `0x5585738127d12542a8fd6c71c19d2e4cecdab08a`
  - `0x0e0b5a3f244686cf9e7811754379b9114d42f78b`
  - `0x704cf59b16fd50efd575342b46ce9c5e07076a4a`
  - `0x0a057a7172d0466aef80976d7e8c80647dfd35e3`
  - `0x68dfc526037e9030c8f813d014919cc89e7d4d74`
  - `0x26c43a1d431a4e5ee86cd55ed7ef9edf3641e901`

To customise it, take a look at [the configuration section](/config/#buidler-evm-network).

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
- `eth_signTypedData`
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

#### Special testing/debugging methods

- `evm_increaseTime` – same as Ganache.
- `evm_mine` – same as Ganache
- `evm_revert` – same as Ganache.
- `evm_snapshot` – same as Ganache.
- `evm_setNextBlockTimestamp` - set the timestamp to be used for the next block, if next block is mined with a timestamp, this set will be resetted, on the other hand, it is only effective for only 1 next block.

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

## Limitations

### Supported Solidity versions

Buidler EVM can run any smart contract, but it only understands Solidity 0.5.1 and newer.

If you are compiling with an older version of Solidity, or using another language, you can use Buidler EVM, but
Solidity stack traces won't be generated.

### Solidity optimizer support

Buidler EVM can work with smart contracts compiled with optimizations,
but this may lead to your stack traces' line numbers being a little off.

We recommend compiling without optimizations when testing and debugging
your contracts.

### Contracts reloading after recompilation

If you start Buidler EVM's node and change your contract afterwards, you won't
get Solidity stack traces for those, and the logging functionality will be more limited.

As a temporal workaround, you need to restart Buidler EVM's node, after recompiling
your contracts.

This limitation will be removed in a future update.
