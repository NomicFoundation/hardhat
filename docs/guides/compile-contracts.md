# Compiling your contracts

To compile your contracts in your Hardhat project, use the `compile` built-in task:
```
$ npx hardhat compile
Compiling...
Compiled 1 contract successfully
```

The compiled artifacts will be saved in the `artifacts/` directory by default, or whatever your configured artifacts path is. Look at the [paths configuration section](../config) to learn how to change it. This directory will be created if it doesn't exist.

After the initial compilation, if the contract code hasn't changed then Hardhat will skip compilation when running the `compile` task:
```
$ npx hardhat compile
All contracts have already been compiled, skipping compilation.
```

To force a compilation you can use the `--force` argument, or run `npx hardhat clean` to clear the caches and delete the artifacts.

## Artifacts
 
Compiling with Hardhat generates one JSON artifact per contract. These are compatible with most tools, including Truffle's artifact format. 

Each artifact consists of a json with the following properties:

- `contractName`: A string with the contract's name.

- `abi`: A [JSON description](https://solidity.readthedocs.io/en/latest/abi-spec.html#abi-json) of the contract's ABI.

- `bytecode`: A `"0x"`-prefixed hex string of the unlinked deployment bytecode. If the contract is not deployable then, this has the `"0x"` string.

- `deployedBytecode`: A `"0x"`-prefixed hex string of the unlinked runtime/deployed bytecode. If the contract is not deployable then, this has the `"0x"` string.

- `linkReferences`: The bytecode's link references object [as returned by solc](https://solidity.readthedocs.io/en/latest/using-the-compiler.html). If the contract doesn't need to be linked, this value contains an empty object.

- `deployedLinkReferences`: The deployed bytecode's link references object [as returned by solc](https://solidity.readthedocs.io/en/latest/using-the-compiler.html). If the contract doesn't need to be linked, this value contains an empty object.

## Configuring the compiler

If you need to customize the `solc` compiler options, then you can do so through the `solc` config field in your `hardhat.config.js`, which is an optional object that can contain the following properties:

- `version`: the solc version to use. We recommend always setting this field. Default value: `"0.5.15"`.

- `optimizer`: an object with `enabled` and `runs` keys. Default value: `{ enabled: false, runs: 200 }`.

- `evmVersion`: a string controlling the target evm version. One of `homestead`, `tangerineWhistle`, `spuriousDragon`, `byzantium`, `constantinople`, `petersburg`, and `instanbul`. Default value: managed by `solc`. 

## Solidity 5 and Solidity 6 contracts in the same project

Hardhat can handle scenarios where you need to compile Solidity 5 and Solidity 6 contracts in the same project. An example of this is when there are deployed contracts that have been written in Solidity 5 but your new contracts that depend on the old ones are written in Solidity 6, or different contract dependencies use different Solidity versions and you need both of these to play along to run your tests.

We have a plugin to make this easier on our roadmap, but until that's released you will need to create an extra config file to compile the Solidity 5 contracts, and two separate directories for the code. 

Create the directories `5` and `6` inside `contracts/` so that it looks like this:
```
contracts/
  5/
  6/
```

Create a `hardhat.config.5.js` with the following contents:
```js
module.exports = {
  solc: {
    version: "0.5.3"
  },
  paths: {
    sources: "./contracts/5",
  }
};
```

Set your `hardhat.config.js` to the following contents:
```js
usePlugin("@nomiclabs/hardhat-waffle");

module.exports = {
  solc: {
    version: "0.6.8"
  },
  paths: {
    sources: "./contracts/6",
  }
};
```

Then run at least once `npx hardhat compile --config hardhat.config.5.js`, and use `npx hardhat test` as you normally would to run your tests.

Note that this section isn't exclusively for Solidity `5` and `6`, but also works with Solidity `4`.

For any help or feedback you may have, you can find us in the [Hardhat Support Telegram group](http://t.me/HardhatSupport).
