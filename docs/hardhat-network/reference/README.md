# Hardhat Network Reference

## Supported hardforks

- byzantium
- constantinople
- petersburg
- istanbul
- muirGlacier
- london
- arrowGlacier

## Config

### Supported Fields

You can set the following fields on the `networks.hardhat` config:

#### `chainId`

The chain ID number used by Hardhat Network's blockchain. Default value: `31337`.

#### `from`

The address to use as default sender. If not present the first account of the Hardhat Network is used.

#### `gas`

Its value should be `"auto"` or a number. If a number is used, it will be the gas limit used by default in every transaction. If `"auto"` is used, the gas limit will be automatically estimated. Default value: the same value as `blockGasLimit`.

#### `gasPrice`

Its value should be `"auto"` or a number. This parameter behaves like `gas`. Default value: `"auto"`.

#### `gasMultiplier`

A number used to multiply the results of gas estimation to give it some slack due to the uncertainty of the estimation process. Default value: `1`.

#### `accounts`

This field can be configured as one of these:

- An object describing an [HD wallet](#hd-wallet-config). This is the default. It can have any of the following fields:
  - `mnemonic`: a 12 or 24 word mnemonic phrase as defined by BIP39. Default value: `"test test test test test test test test test test test junk"`
  - `initialIndex`: The initial index to derive. Default value: `0`.
  - `path`: The HD parent of all the derived keys. Default value: `"m/44'/60'/0'/0"`.
  - `count`: The number of accounts to derive. Default value: `20`.
  - `accountsBalance`: string with the balance (in wei) assigned to every account derived. Default value: `"10000000000000000000000"` (10000 ETH).
- An array of the initial accounts that the Hardhat Network will create. Each of them must be an object with `privateKey` and `balance` fields.

#### `blockGasLimit`

The block gas limit to use in Hardhat Network's blockchain. Default value: `30_000_000`

#### `hardfork`

This setting changes how Hardhat Network works, to mimic Ethereum's mainnet at a given hardfork. It must be one of `"byzantium"`, `"constantinople"`, `"petersburg"`, `"istanbul"`, `"muirGlacier"`, `"berlin"`, `"london"` and `"arrowGlacier"`. Default value: `"arrowGlacier"`

#### `throwOnTransactionFailures`

A boolean that controls if Hardhat Network throws on transaction failures. If this value is `true`, Hardhat Network will throw [combined JavaScript and Solidity stack traces](../hardhat-network/README.md#solidity-stack-traces) on transaction failures. If it is `false`, it will return the failing transaction hash. In both cases the transactions are added into the blockchain. Default value: `true`

#### `throwOnCallFailures`

A boolean that controls if Hardhat Network throws on call failures. If this value is `true`, Hardhat Network will throw [combined JavaScript and Solidity stack traces](../hardhat-network/README.md#solidity-stack-traces) when a call fails. If it is `false`, it will return the call's `return data`, which can contain a revert reason. Default value: `true`

#### `loggingEnabled`

A boolean that controls if Hardhat Network logs every request or not. Default value: `false` for the in-process Hardhat Network provider, `true` for the Hardhat Network backed JSON-RPC server (i.e. the `node` task).

#### `initialDate`

An optional string setting the date of the blockchain. Valid values are [Javascript's date time strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse#Date_Time_String_Format). Default value: the current date and time if not forking another network. When forking another network, the timestamp of the block you forked from, plus one second, is used.

#### `allowUnlimitedContractSize`

An optional boolean that disables the contract size limit imposed by the [EIP 170](https://eips.ethereum.org/EIPS/eip-170). Default value: `false`

#### `forking`

An object that describes the [forking](../guides/mainnet-forking.md) configuration that can have the following fields:

- `url`: a URL that points to a JSON-RPC node with state that you want to fork off. There's no default value for this field. It must be provided for the fork to work.
- `blockNumber`: an optional number to pin which block to fork from. If no value is provided, the latest block is used.
- `enabled`: an optional boolean to switch on or off the fork functionality. Default value: `true` if `url` is set, `false` otherwise.

#### `chains`

An object that configures chain-specific options. Each key is a number representing a chain ID, and each value is an object configuring the chain with that ID. In the inner object, the following fields are supported:

- `hardforkHistory`: an object whose keys are strings representing hardfork names (eg `"london"`, `"berlin"`) and whose values are numbers specifying the block at which that hardfork was activated.

The default value includes configurations for several well known chains (eg mainnet, chain ID `1`); using this field is only useful when forking unusual networks. The user may override the defaults for some chain ID's while leaving the defaults in place for other chain ID's. Overriding the default for a chain ID will replace the entire configuration for that chain.

For more details, see [Using a custom hardfork history](../guides/mainnet-forking.md#using-a-custom-hardfork-history).

#### `minGasPrice`

The minimum `gasPrice` that a transaction must have. This field must not be present if the `"hardfork"` is `"london"` or a later one. Default value: `"0"`.

#### `initialBaseFeePerGas`

The `baseFeePerGas` of the first block. Note that when forking a remote network, the "first block" is the one immediately after the block you forked from. This field must not be present if the `"hardfork"` is not `"london"` or a later one. Default value: `"1000000000"` if not forking. When forking a remote network, if the remote network uses EIP-1559, the first local block will use the right `baseFeePerGas` according to the EIP, otherwise `"10000000000"` is used.

- `coinbase`: The address used as coinbase in new blocks. Default value: `"0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e"`.

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

#### Transaction ordering

Hardhat Network can sort mempool transactions in two different ways. How they are sorted will alter which transactions from the mempool get included in the next block, and in which order.

The first ordering mode, called `"priority"`, mimics Geth's behavior. This means that it prioritizes transactions based on the fees paid to the miner. This is the default.

The second ordering mode, called `"fifo"`, keeps the mempool transactions sorted in the order they arrive.

You can change the ordering mode with:

```json
networks: {
  hardhat: {
    mining: {
      mempool: {
        order: "fifo"
      }
    }
  }
}
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

Hardhat Network allows you to send transactions impersonating specific account and contract addresses.

To impersonate an account use the this method, passing the address to impersonate as its parameter:

```tsx
await hre.network.provider.request({
  method: "hardhat_impersonateAccount",
  params: ["0x364d6D0333432C3Ac016Ca832fb8594A8cE43Ca6"],
});
```

If you are using [`hardhat-ethers`](https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-ethers), call `getSigner` after impersonating the account:

```
const signer = await ethers.getSigner("0x364d6D0333432C3Ac016Ca832fb8594A8cE43Ca6")
signer.sendTransaction(...)
```

Call [`hardhat_stopImpersonatingAccount`](#hardhat-stopimpersonatingaccount) to stop impersonating.

<!-- intentionally undocumented, internal method:
#### `hardhat_intervalMine`
-->

#### `hardhat_getAutomine`

Returns `true` if automatic mining is enabled, and `false` otherwise. See [Mining Modes](../explanation/mining-modes.md) to learn more.

#### `hardhat_reset`

See the [Mainnet Forking guide](../guides/mainnet-forking.md)

#### `hardhat_setBalance`

Modifies the balance of an account.

For example:

```tsx
await network.provider.send("hardhat_setBalance", [
  "0x0d2026b3EE6eC71FC6746ADb6311F6d3Ba1C000B",
  "0x1000",
]);
```

This will result in account `0x0d20...000B` having a balance of 4096 wei.

#### `hardhat_setCode`

Modifies the bytecode stored at an account's address.

For example:

```tsx
await network.provider.send("hardhat_setCode", [
  "0x0d2026b3EE6eC71FC6746ADb6311F6d3Ba1C000B",
  "0xa1a2a3...",
]);
```

This will result in account `0x0d20...000B` becoming a smart contract with bytecode `a1a2a3....` If that address was already a smart contract, then its code will be replaced by the specified one.

#### `hardhat_setCoinbase`

Sets the coinbase address to be used in new blocks.

For example:

```tsx
await network.provider.send("hardhat_setCoinbase", [
  "0x0d2026b3EE6eC71FC6746ADb6311F6d3Ba1C000B",
]);
```

This will result in account `0x0d20...000B` being used as miner/coinbase in every new block.

#### `hardhat_setLoggingEnabled`

Enable or disable logging in Hardhat Network

#### `hardhat_setMinGasPrice`

Change the minimum gas price accepted by the network (in wei)

#### `hardhat_setNextBlockBaseFeePerGas`

Sets the base fee of the next block.

For example:

```tsx
await network.provider.send("hardhat_setNextBlockBaseFeePerGas", [
  "0x2540be400", // 10 gwei
]);
```

This only affects the next block; the base fee will keep being updated in each subsequent block according to [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559).

#### `hardhat_setNonce`

Modifies an account's nonce by overwriting it.

For example:

```tsx
await network.provider.send("hardhat_setNonce", [
  "0x0d2026b3EE6eC71FC6746ADb6311F6d3Ba1C000B",
  "0x21",
]);
```

This will result in account `0x0d20...000B` having a nonce of 33.

Throws an `InvalidInputError` if nonce is smaller than the current one. The reason for this restriction is to avoid collisions when deploying contracts using the same nonce more than once.

You can only use this method to increase the nonce of an account; you can't set a lower value than the account's current nonce.

#### `hardhat_setStorageAt`

Writes a single position of an account's storage.

For example:

```tsx
await network.provider.send("hardhat_setStorageAt", [
  "0x0d2026b3EE6eC71FC6746ADb6311F6d3Ba1C000B",
  "0x0",
  "0x0000000000000000000000000000000000000000000000000000000000000001",
]);
```

This will set the contract's first storage position (at index `0x0`) to 1.

The mapping between a smart contract's variables and its storage position is not straightforward except in some very simple cases. For example, if you deploy this contract:

```solidity
contract Foo {
  uint public x;
}
```

And you set the first storage position to 1 (as shown in the previous snippet), then calling `foo.x()` will return 1.

The storage position index must not exceed 2^256, and the value to write must be exactly 32 bytes long.

#### `hardhat_stopImpersonatingAccount`

Use this method to stop impersonating an account after having previously used [`hardhat_impersonateAccount`](#hardhat-impersonateaccount), like:

```tsx
await hre.network.provider.request({
  method: "hardhat_stopImpersonatingAccount",
  params: ["0x364d6D0333432C3Ac016Ca832fb8594A8cE43Ca6"],
});
```

### Special testing/debugging methods

#### `evm_increaseTime`

Same as Ganache.

#### `evm_mine`

Same as Ganache

#### `evm_revert`

Same as Ganache.

#### `evm_setAutomine`

Enables or disables, based on the single boolean argument, the automatic mining of new blocks with each new transaction submitted to the network. You can use [`hardhat_getAutomine`](#hardhat-getautomine) to get the current value. See also [Mining Modes](../explanation/mining-modes.md).

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
