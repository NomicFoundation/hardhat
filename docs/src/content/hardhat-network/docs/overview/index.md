---
title: Hardhat Network
description: Hardhat Network is a local Ethereum node designed for development. It allows you to deploy your contracts, run your tests and debug your code.
---

# Hardhat Network <!-- An Explanation: theoretical, not practical; for studying, not for working-->

<!-- TODO: make all RPC method mentions be links to the reference on those methods. -->

Hardhat comes built-in with Hardhat Network, a local Ethereum network node designed for development. It allows you to deploy your contracts, run your tests and debug your code, all within the confines of your local machine.

## How does it work?

It runs as either an in-process or stand-alone daemon, servicing JSON-RPC and WebSocket requests.

By default, it mines a block with each transaction that it receives, in order and with no delay.

It's backed by [EDR](https://github.com/NomicFoundation/edr), Nomic Foundation's Ethereum development runtime implementation for building developer tools.

## How can I use it?

By default, if you're using Hardhat, then you're already using Hardhat Network.

When Hardhat executes your tests, scripts or tasks, an in-process Hardhat Network node is started automatically, and all of Hardhat's plugins (ethers.js, web3.js, Waffle, Truffle, etc) will connect directly to this node's provider.

There's no need to make any changes to your tests or scripts.

Hardhat Network is simply another network. If you wanted to be explicit, you could run, for example, `npx hardhat ignition deploy ./ignition/modules/MyModule.ts --network hardhat`.

### Running stand-alone in order to support wallets and other software

Alternatively, Hardhat Network can run in a stand-alone fashion so that external clients can connect to it. This could be a wallet, your Dapp front-end, or a Hardhat Ignition deployment. To run Hardhat Network in this way, run:

```
$ npx hardhat node
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
...
```

This will start Hardhat Network, and expose it as a JSON-RPC and WebSocket server.

Then, just connect your wallet or application to `http://127.0.0.1:8545`.

If you want to connect Hardhat to this node, you just need to run using `--network localhost`.

:::warning

_Do not send mainnet Ether to the account addresses shown by `hardhat node`_. Those addresses and private keys are deterministic: they are the same for _all_ Hardhat users. Accordingly, those private keys are well known, so there are probably bots monitoring these addresses on mainnet, waiting to withdraw any funds sent to them. If you add any of those accounts to a wallet (eg Metamask), be very careful to avoid sending any mainnet Ether to them: consider naming the account something like "Hardhat - Unsafe" in order to prevent any mistakes.

:::

## Why would I want to use it?

### Solidity stack traces

Hardhat Network has first-class Solidity support. It always knows which smart contracts are being run, what they do exactly and why they fail.

If a transaction or call fails, Hardhat Network will throw an exception. This exception will have a combined JavaScript and Solidity stack trace: stack traces that start in JavaScript/TypeScript up to your call to the contract, and continue with the full Solidity call stack.

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

The last two lines correspond to the JavaScript test code that executed a failing transaction. The rest is the Solidity stack trace. This way you know exactly why your tests aren't passing.

### Automatic error messages

Hardhat Network always knows why your transaction or call failed, and it uses this information to make debugging your contracts easier.

When a transaction fails without a reason, Hardhat Network will create a clear error message in the following cases:

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

### `console.log`

Hardhat Network allows you to print logging messages and contract variables by calling `console.log()` from your Solidity code.

To use it, you simply import `hardhat/console.sol` and call it. It implements the same formatting options that can be found in Node.js' [`console.log`](https://nodejs.org/dist/latest-v12.x/docs/api/console.html#console_console_log_data_args), which in turn uses [`util.format`](https://nodejs.org/dist/latest-v12.x/docs/api/util.html#util_util_format_format_args). For example: `console.log("Changing owner from %s to %s", currentOwner, newOwner)`.

It always works, regardless of the call or transaction failing or being successful. And, because it's implemented in standard Solidity, it works with _any_ tool or library, emitting log entries where it's fully supported &mdash; Hardhat Network, Remix, and Tenderly &mdash; and falling back gracefully to a no-op everywhere else &mdash; Remix, Waffle, Truffle, etc &mdash; though it does consume a small amount of gas on live networks.

You can see an example in the Sample Project. Follow the steps in [Quick Start](/hardhat-runner/docs/getting-started/index.md#quick-start) to try it out. You can also refer to more details in [the reference documentation](./reference/index.md#console.log).

### Mainnet forking

Hardhat Network has the ability to copy the state of the mainnet blockchain into your local environment, including all balances and deployed contracts. This is known as "forking mainnet."

In a local environment forked from mainnet, you can execute transactions to invoke mainnet-deployed contracts, or interact with the network in any other way that you would with mainnet. In addition, you can do anything supported by a non-forked Hardhat Network: see console logs, get stack traces, or use the default accounts to deploy new contracts.

More generally, Hardhat Network can be used to fork **any** network, not just mainnet. Even further, Hardhat Network can be used to fork **any EVM-compatible blockchain**, not just Ethereum.

There are other things you can do with a forked Hardhat Network. Check [our guide](guides/forking-other-networks.md) to learn more.

### Mining modes

Hardhat Network can be configured to **automine** blocks, immediately upon receiving each transaction, or it can be configured for **interval mining**, where a new block is mined periodically, incorporating as many pending transactions as possible.

You can use one of these modes, both or neither. By default, only the automine mode is enabled.

If neither mining mode is enabled, no new blocks will be mined, but you can manually mine new blocks using the `evm_mine` RPC method. This will generate a new block that will include as many pending transactions as possible.

For more details on mining modes and mempool behavior, see [Mining Modes](explanation/mining-modes.md).

### Logging

Hardhat Network uses its tracing infrastructure to offer rich logging that will help you develop and debug smart contracts.

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

This logging is enabled by default when using Hardhat Network's node (i.e. `npx hardhat node`), but disabled when using the in-process Hardhat Network provider. See [Hardhat Network's config](./reference#config) to learn more about how to control its logging.

### The `debug_traceTransaction` method

You can get debug traces of already-mined transactions using the `debug_traceTransaction` RPC method. The returned object has a detailed description of the transaction execution, including a list of steps describing each executed opcode and the state of the EVM at that point.

If you are using [mainnet forking](guides/forking-other-networks.html) with an archive node, you can get traces of transactions from the remote network even if the node you are using doesn't support `debug_traceTransaction`.

For more details, see [the reference documentation for this method](./reference/index.md#debug-tracetransaction).

## Dig deeper

This has been just a high-level explanation of what Hardhat Network is. To dig deeper, see [the Reference documentation](./reference/index.md). <!-- TODO: when they exist, add additional links here to "Guides", "Tutorials" and "Explanations" of more specific things. -->
