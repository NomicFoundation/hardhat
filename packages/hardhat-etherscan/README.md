[![npm](https://img.shields.io/npm/v/@nomiclabs/hardhat-etherscan.svg)](https://www.npmjs.com/package/@nomiclabs/hardhat-etherscan) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# hardhat-etherscan

[Hardhat](https://hardhat.org) plugin for integration with [Etherscan](https://etherscan.io)'s contract verification service.

## What

This plugin helps you verify the source code for your Solidity contracts on [Etherscan](https://etherscan.io).

It's smart and it tries to do as much as possible to facilitate the process:

- Just provide the deployment address and constructor arguments, and the plugin will detect locally which contract to verify.
- If your contract uses Solidity libraries, the plugin will detect them and deal with them automatically. You don't need to do anything about them.
- A simulation of the verification process will run locally, allowing the plugin to detect and communicate any mistakes during the process.
- Once the simulation is successful the contract will be verified using the Etherscan API.

## Installation

```bash
npm install --save-dev @nomiclabs/hardhat-etherscan
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomiclabs/hardhat-etherscan");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomiclabs/hardhat-etherscan";
```

## Tasks

This plugin provides the `verify` task, which allows you to verify contracts through Etherscan's service.

## Environment extensions

This plugin does not extend the environment.

## Usage

You need to add the following Etherscan config to your `hardhat.config.js` file:

```js
module.exports = {
  networks: {
    mainnet: { ... }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: "YOUR_ETHERSCAN_API_KEY"
  }
};
```

Alternatively you can specify more than one block explorer API key, by passing an object under the `apiKey` property, see [`Multiple API keys and alternative block explorers`](#multiple-api-keys-and-alternative-block-explorers).

Lastly, run the `verify` task, passing the address of the contract, the network where it's deployed, and the constructor arguments that were used to deploy it (if any):

```bash
npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
```

### Complex arguments

When the constructor has a complex argument list, you'll need to write a javascript module that exports the argument list. The expected format is the same as a constructor list for an [ethers contract](https://docs.ethers.io/v5/api/contract/). For example, if you have a contract like this:

```solidity
struct Point {
  uint x;
  uint y;
}

contract Foo {
  constructor (uint x, string s, Point memory point, bytes b) { ... }
}
```

then you can use an `arguments.js` file like this:

```js
module.exports = [
  50,
  "a string argument",
  {
    x: 10,
    y: 5,
  },
  // bytes have to be 0x-prefixed
  "0xabcdef",
];
```

Where the third argument represents the value for the `point` parameter.

The module can then be loaded by the `verify` task when invoked like this:

```bash
npx hardhat verify --constructor-args arguments.js DEPLOYED_CONTRACT_ADDRESS
```

### Libraries with undetectable addresses

Some library addresses are undetectable. If your contract uses a library only in the constructor, then its address cannot be found in the deployed bytecode.

To supply these missing addresses, you can create a javascript module that exports a library dictionary and pass it through the `--libraries` parameter:

```bash
hardhat verify --libraries libraries.js OTHER_ARGS
```

where `libraries.js` looks like this:

```js
module.exports = {
  SomeLibrary: "0x...",
};
```

### Multiple API keys and alternative block explorers

If your project targets multiple EVM-compatible networks that have different explorers, you'll need to set multiple API keys.

To configure the API keys for the chains you are using, provide an object under `etherscan/apiKey` with the identifier of each chain as the key. **This is not necessarily the same name that you are using to define the network**. For example, if you are going to verify contracts in Ethereum mainnet, Optimism and Arbitrum, your config would look like this:

```js
module.exports = {
  networks: {
    mainnet: { ... },
    testnet: { ... }
  },
  etherscan: {
    apiKey: {
        mainnet: "YOUR_ETHERSCAN_API_KEY",
        optimisticEthereum: "YOUR_OPTIMISTIC_ETHERSCAN_API_KEY",
        arbitrumOne: "YOUR_ARBISCAN_API_KEY",
    }
  }
};
```

To see the full list of supported networks, run `npx hardhat verify --list-networks`. The identifiers shown there are the ones that should be used as keys in the `apiKey` object.

### Adding support for other networks

If the chain you are using is not in the list, you can manually add the necessary information to verify your contracts on it. For this you need three things: the chain id of the network, the URL of the verification endpoint, and the URL of the explorer.

For example, if Goerli wasn't supported, you could add it like this:

```
etherscan: {
  apiKey: {
    goerli: "<goerli-api-key>"
  },
  customChains: [
    {
      network: "goerli",
      chainId: 5,
      urls: {
        apiURL: "https://api-goerli.etherscan.io/api",
        browserURL: "https://goerli.etherscan.io"
      }
    }
  ]
}
```

Keep in mind that the name you are giving to the network in `customChains` is the same one that has to be used in the `apiKey` object.

To see which custom chains are supported, run `npx hardhat verify --list-networks`.

### Using programmatically

To call the verification task from within a Hardhat task or script, use the `"verify:verify"` subtask. Assuming the same contract as [above](#complex-arguments), you can run the subtask like this:

```js
await hre.run("verify:verify", {
  address: contractAddress,
  constructorArguments: [
    50,
    "a string argument",
    {
      x: 10,
      y: 5,
    },
    "0xabcdef",
  ],
});
```

If the verification is not successful, an error will be thrown.

#### Providing libraries from a script or task

If your contract has libraries with undetectable addresses, you may pass the libraries parameter with a dictionary specifying them:

```js
hre.run("verify:verify", {
  // other args
  libraries: {
    SomeLibrary: "0x...",
  }
}
```

## How it works

The plugin works by fetching the bytecode in the given address and using it to check which contract in your project corresponds to it. Besides that, some sanity checks are performed locally to make sure that the verification won't fail.

## Known limitations

- Adding, removing, moving or renaming new contracts to the hardhat project or reorganizing the directory structure of contracts after deployment may alter the resulting bytecode in some solc versions. See this [Solidity issue](https://github.com/ethereum/solidity/issues/9573) for further information.
