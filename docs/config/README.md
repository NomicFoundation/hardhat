# Configuration

When Buidler is run, it searches for the closest `buidler.config.js` file starting
from the Current Working Directory. This file normally lives in the root of your project. An empty `buidler.config.js` is enough for Buidler to work.

The entirety of your Buidler setup (i.e. your config, plugins and custom tasks) is contained in this file.

## Available config options

To set up your config, you have to export an object from `buidler.config.js`.

This object can have the following entries: `defaultNetwork`, `networks`, `solc`, and `paths`. A complete configuration would look like this:

```js
module.exports = {
  defaultNetwork: "networkName",
  networks: {...},
  solc: {...},
  paths:{...}
}
```

## Networks configuration

The `networks` config field is an optional object where network names map to their configuration.

There are two kinds of networks in Buidler: [JSON-RPC](https://github.com/ethereum/wiki/wiki/JSON-RPC) based networks,
and the built-in Buidler EVM network.

You can customize which network is used by default when running Buidler by setting the config's `defaultNetwork` field. If you omit this config, its default value is `"buidlerevm"`.

### Buidler EVM network

Buidler comes built-in with a especial network called `buidlerevm`. When using this network,
an instance of [Buidler EVM](../buidler-evm) will be automatically created when your run a task, script or test your smart contracts

Buidler EVM has first-class support of Solidity. It always knows which
smart contracts are being run and knows exactly what they do and why
they fail. Learn more about it [here](../buidler-evm).

You can set the following fields on the `buidlerevm` config:

- `chainId`: The chan id number used by Buidler EVM's blockchain. Default value: `31337`.

- `from`: The address to use as default sender. If not present the first account of the Buidler EVM is used.

- `gas`: Its value should be `"auto"` or a number. If a number is used, it will be the gas limit used by default in every transaction. If `"auto"` is used, the gas limit will be automatically estimated. Default value: `9500000`.

- `gasPrice`: Its value should be `"auto"` or a number. This parameter behaves like `gas`. Default value: `8000000000`.

- `gasMultiplier`: A number used to multiply the results of gas estimation to give it some slack due to the uncertainty of the estimation process. Default: `1`.

- `accounts`: An array of the initial accounts that Buidler EVM will create. Each of them must be an object with `privateKey` and `balance` fields. Both of them `0x`-prefixed strings. By default, it has 20 accounts with 10000 ETH each.

- `blockGasLimit`: The block gas limit to use in Buidler EVM's blockchain. Default value: `9500000`

- `hardfork`: This setting changes how Buidler EVM works, to mimic Ethereum's mainnet at a given hardfork. It must be one of `"byzantium"`, `"constantinople"`, `"petersburg"`, and `"istanbul"`. Default value: `"istanbul"`

- `throwOnTransactionFailures`: A boolean that controls if Buidler EVM throws on transaction failures.
  If this value is `true`, Buidler EVM will throw [combined JavaScript and Soldity stack traces](../buidler-evm/README.md#solidity-stack-traces)
  on transaction failures. If it is `false`, it will return the failing transaction hash. In both cases
  the transactions are added into the blockchain. Default value: `true`
- `throwOnCallFailures`: A boolean that controls if Buidler EVM throws on call failures.
  If this value is `true`, Buidler EVM will throw [combined JavaScript and Soldity stack traces](../buidler-evm/README.md#solidity-stack-traces)
  when a call fails. If it is `false`, it will return the call's `return data`, which can contain
  a revert reason. Default value: `true`

- `loggingEnabled`: A boolean that controls if Buidler EVM logs every request or not. Default value: `false` for the
  in-process Buidler EVM provider, `true` for the Buidler EVM backed JSON-RPC server (i.e. the `node` task).

- `intialDate`: An optional string setting the date of the blockchain. If no option is set, the current date is used. Valid values are [Javascript's date time strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse#Date_Time_String_Format).

### JSON-RPC based networks

These are networks that connect to an external node. Nodes can be running in your computer, like Ganache, or remotely,
like Infura.

This kind of networks are configured with objects with the following fields:

- `url`: The url of the node. This argument is required for custom networks.

- `chainId`: An optional number, used to validate the network Buidler connects to. If not present, this validation is omitted.

- `from`: The address to use as default sender. If not present the first account of the node is used.

- `gas`: Its value should be `"auto"` or a number. If a number is used, it will be the gas limit used by default in every transaction. If `"auto"` is used, the gas limit will be automatically estimated. Default value: `"auto"`.

- `gasPrice`: Its value should be `"auto"` or a number. This parameter behaves like `gas`. Default value: `"auto"`.

- `gasMultiplier`: A number used to multiply the results of gas estimation to give it some slack due to the uncertainty of the estimation process. Default: `1`.

- `accounts`: This field controls which accounts Buidler uses. It can use the node's accounts (by setting it to `"remote"`), a list of local accounts (by setting it to an array of hex-encoded private keys), or use an [HD Wallet](#hd-wallet-config). Default value: `"remote"`.

- `httpHeaders`: You can use this field to set extra HTTP Headers to be used when making JSON-RPC requests. It accepts a JavaScript object which maps header names to their values. Default value: `undefined`.

- `timeout`: Timeout in ms for requests sent to the JSON-RPC server. If the request takes longer than this, it will be cancelled. Default value: `20000`.

### HD Wallet config

To use an HD Wallet with Buidler you should set your network's `accounts` field to an object with the following fields:

- `mnemonic`: A required string with the mnemonic of the wallet.

- `path`: The HD parent of all the derived keys. Default value: `"m/44'/60'/0'/0"`.

- `initialIndex`: The initial index to derive. Default value: `0`.

- `count`: The number of accounts to derive. Default value: `10`.

### Default networks object

```js
{
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    buidlerevm: {
      // See its defaults
    }
}
```

## Solc configuration

The `solc` config field is an optional object which can contain the following keys:

- `version`: The solc version to use. We recommend always setting this field. Default value: `"0.5.15"`.

- `optimizer`: An object with `enabled` and `runs` keys. Default value: `{ enabled: false, runs: 200 }`.

- `evmVersion`: A string controlling the target evm version. One of `"homestead"`, `"tangerineWhistle"`, `"spuriousDragon"`, `"byzantium"`, `"constantinople"`, `"petersburg"`, `"istanbul""`. Default value: managed by Solidity. Please, consult its documentation.

## Path configuration

You can customize the different paths that Buidler uses by providing an object with the following keys:

- `root`: The root of the Buidler project. This path is resolved from the `buidler.config.js`'s directory. Default value: The directory containing the config file.
- `sources`: The directory where your contract are stored. This path is resolved from the project's root. Default value: './contracts'.
- `tests`: The directory where your tests are located. This path is resolved from the project's root. Default value: './test'.

- `cache`: The directory used by Buidler to cache its internal stuff. This path is resolved from the project's root. Default value: './cache'.
- `artifacts`: The directory where the compilation artifacts are stored. This path is resolved from the project's root. Default value: './artifacts'.

## Quickly integrating other tools from Buidler's config

Buidler's config file will always run before any task, so you can use it to integrate with other tools, like importing `@babel/register`.
