# Hardhat Network

Hardhat comes built-in with Hardhat Network, a local Ethereum network designed for development. It allows you to deploy your contracts, run your tests and debug your code.

## How does it work?

- It mines a block with each transaction that it receives, in order and with no delay.
- It's backed by the `ethereumjs-vm` EVM implementation, the same one used by ganache, Remix and Ethereum Studio.
- It supports the following hardforks:
  - byzantium
  - constantinople
  - petersburg
  - istanbul
  - muirGlacier

## How can I use it?

- Hardhat will always spin up an instance on startup when `defaultNetwork` is empty or set to `hardhat`. It's the default behavior.
- It can be used to run tests, in the console, scripts, and tasks.
- Plugins (ethers.js, web3.js, Waffle, Truffle, etc) connect directly to the provider.
- There's no need to make any changes to your tests or scripts.
- It's simply another network and it can be used with `--network`.

## Connecting to Hardhat Network from wallets and other software

Hardhat Network can run in a standalone fashion so that external clients can connect to it. This could be MetaMask, your Dapp front-end, or a script. To run Hardhat Network in this way, run:

```
npx hardhat node
```

It will start Hardhat Network, and expose it as a JSON-RPC and WebSocket server.

Then, just connect your wallet or application to `http://localhost:8545`.

If you want to connect Hardhat to this node, you only need to run it using `--network localhost`.

## Solidity stack traces

Hardhat Network has first-class Solidity support. It always knows which
smart contracts are being run, what they do exactly and why they fail.

If a transaction or call fails, Hardhat Network will throw an exception.
This exception will have a combined JavaScript and Solidity stack
trace: stack traces that start in JavaScript/TypeScript up to your
call to the contract, and continue with the full Solidity call stack.

This is an example of a Hardhat Network exception using `TruffleContract`:

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

Hardhat Network always knows why your transaction or call failed, and uses this
information to make debugging your contracts easier.

When a transaction fails without a reason, Hardhat Network will create a clear
error message in the following cases:

- Calling a non-payable function with ETH

- Sending ETH to a contract without a payable fallback or receive function 

- Calling a non-existent function when there's no fallback function

- Calling a function with incorrect parameters

- Calling an external function that doesn't return the right amount of data

- Calling an external function on a non-contract account

- Failing to execute an external call because of its parameters (e.g. trying to send too much ETH)

- Calling a library without `DELEGATECALL`

- Incorrectly calling a precompiled contract

- Trying to deploy a contract that exceeds the bytecode size limit imposed by [EIP-170](https://eips.ethereum.org/EIPS/eip-170)

## `console.log`

Hardhat Network allows you to print logging messages and contract variables calling `console.log()` from your Solidity code. You can see an example in the Sample Project. Follow the steps in [Quick Start](/getting-started/README.md#quick-start) to try it out.

- You can use it in calls and transactions. It works with `view` functions, but not in `pure` ones.
- It always works, regardless of the call or transaction failing or being successful.
- To use it you need to import `hardhat/console.sol`.
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
  - `console.logBytes1(bytes1 b)`
  - `console.logBytes2(bytes2 b)`
  - ...
  - `console.logBytes32(bytes32 b)`
- `console.log` implements the same formatting options that can be found in Node.js' [`console.log`](https://nodejs.org/dist/latest-v12.x/docs/api/console.html#console_console_log_data_args), which in turn uses [`util.format`](https://nodejs.org/dist/latest-v12.x/docs/api/util.html#util_util_format_format_args).
  - Example: `console.log("Changing owner from %s to %s", currentOwner, newOwner)`
- It works with any library: ethers.js, web3.js, waffle, truffle-contract, etc.
- `console.log` is implemented in standard Solidity and then detected in Hardhat Network. This makes its compilation work with any other tools (like Remix, Waffle or Truffle).
- `console.log` calls can run in other networks, like mainnet, kovan, ropsten, etc. They do nothing in those networks, but spend a minimal amount of gas.

## Mainnet forking

The Hardhat Network is empty by default, except for some accounts with an initial balance. But sometimes it's more useful to have a local network that simulates the state of the mainnet. This is what forking is for.

To fork from the mainnet you need the URL of a node to connect to. For example, using Alchemy, you can start a local node that forks the mainnet with this command:

```
npx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/<key>
```

where you have to replace `<key>` with your Alchemy API key.

After doing this, you can do anything in your node that you can do with a non-forked Hardhat Network: see console logs, get stack traces or use the default accounts to deploy new contracts.

If you want this to be the default behavior, you can do it in your Hardhat config:

```js
networks: {
  hardhat: {
    forking: {
      url: "https://eth-mainnet.alchemyapi.io/v2/<key>"
    }
  }
}
```

This means that if you execute a task that uses the Hardhat Network, that task will start a forked node and run on it.

There are other things you can do with a forked Hardhat Network, check [our guide](../guides/mainnet-forking.md) to learn more.

## Mining modes

Hardhat supports two modes for mining transactions:

- **Automine**: each transaction that is sent is automatically included in a new
  block
- **Interval mining**: a new block is periodically mined, which includes as many
  pending transactions as possible

You can use one of these modes, both or neither. By default, only the automine
mode is enabled.

### Configuring mining modes

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

In this example, automining is disabled and interval mining is set so that a new
block is generated every 5 seconds.  You can also configure interval mining to
generate a new block after a random delay:

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

In this case, a new block will be mined after a random delay of between 3 and 6
seconds. For example, the first block could be mined after 4 seconds, the second
block 5.5 seconds after that, and so on.

### Manual mining

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

This means that no new blocks will be mined by the Hardhat Network, but you can
manually mine new blocks using the `evm_mine` RPC method. This will generate a
new block that will include as many pending transactions as possible.

### Mempool behavior

When automine is disabled, every sent transaction is added to the mempool, that
contains all the transactions that could be mined in the future. Hardhat
Network's mempool follows the same rules as geth. This means, among other
things, that:

- Transactions with a higher gas price are included first
- If two transactions can be included and both have the same gas price, the one
  that was received first is included first
- If a transaction is invalid (for example, its nonce is lower than the nonce
of the address that sent it), the transaction is dropped.

You can get the list of pending transactions that will be included in the
next block by using the "pending" block tag:

```js
const pendingBlock = await network.provider.send("eth_getBlockByNumber", ["pending", false])
```

### Configuring mining modes using RPC methods

You can change the mining behavior on runtime using two RPC methods:
`evm_setAutomine` and `evm_setIntervalMining`. For example, to disable
automining:

```js
await network.provider.send("evm_setAutomine", [false])
```

And to enable interval mining:

```js
await network.provider.send("evm_setIntervalMining", [5000])
```

## Logging

Hardhat Network uses its tracing infrastructure to offer rich logging that will help
you develop and debug smart contracts.

For example, a successful transaction and a failed call would look like this:

```
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

This logging is enabled by default when using Hardhat Network's node (i.e. `npx hardhat node`), but disabled when using
the in-process Hardhat Network provider. See [Hardhat Network's config](../config/README.md#hardhat-network) to learn more about how to control its logging.

## Hardhat Network initial state

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

#### Hardhat network methods

- `hardhat_addCompilationResult` – Add information about compiled contracts
- `hardhat_impersonateAccount` – see the [Mainnet Forking guide](../guides/mainnet-forking.md)
- `hardhat_stopImpersonatingAccount` – see the [Mainnet Forking guide](../guides/mainnet-forking.md)
- `hardhat_reset` – see the [Mainnet Forking guide](../guides/mainnet-forking.md)
- `hardhat_setLoggingEnabled` – Enable or disable logging in Hardhat Network

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

## Limitations

### Supported Solidity versions

Hardhat Network can run any smart contract, but it only understands Solidity 0.5.1 and newer.

If you are compiling with an older version of Solidity, or using another language, you can use Hardhat Network, but
Solidity stack traces won't be generated.

### Solidity optimizer support

Hardhat Network can work with smart contracts compiled with optimizations,
but this may lead to your stack traces' line numbers being a little off.

We recommend compiling without optimizations when testing and debugging
your contracts.
