# Compiling your contracts

To compile your contracts in your Hardhat project, use the `compile` built-in task:
```
$ npx hardhat compile
Compiling...
Compiled 1 contract successfully
```

The compiled artifacts will be saved in the `artifacts/` directory by default, or whatever your configured artifacts path is. Look at the [paths configuration section](../config/README.md#path-configuration) to learn how to change it. This directory will be created if it doesn't exist.

After the initial compilation, Hardhat will try to do the least amount of work possible the next time you compile. For example, if you didn't change any file since the last compilation, nothing will be compiled. If you only modified one file, only that file and others affected by it will be recompiled.

```
$ npx hardhat compile
Nothing to compile
```

To force a compilation you can use the `--force` argument, or run `npx hardhat clean` to clear the cache and delete the artifacts.

## Configuring the compiler

If you need to customize the Solidity compiler options, then you can do so through the `solidity` config field in your `hardhat.config.js`. The simplest way to use this field is the shorthand for setting the compiler version, which we recommend always doing:

```js
module.exports = {
  solidity: "0.7.1"
}
```

We recommend always setting a compiler version to avoid unexpected behavior or compiling errors as new releases of Solidity are published.

The expanded usage allows for more control of the compiler:

```js
module.exports = {
  solidity: {
    version: "0.7.1",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  }
}
```

`settings` has the same schema as the `settings` entry in the [Input JSON](https://solidity.readthedocs.io/en/v0.7.2/using-the-compiler.html#input-description) that can be passed to the compiler. Some commonly used settings are:

- `optimizer`: an object with `enabled` and `runs` keys. Default value: `{ enabled: false, runs: 200 }`.

- `evmVersion`: a string controlling the target evm version. One of `homestead`, `tangerineWhistle`, `spuriousDragon`, `byzantium`, `constantinople`, `petersburg`, `istanbul`, and `berlin`. Default value: managed by `solc`. 

If any of your contracts has a version pragma that is not satisfied by the compiler version you configured, then Hardhat will throw an error.

### Multiple Solidity versions

Hardhat supports projects that use different, incompatible versions of solc. For example, if you have a project where some files use Solidity 0.5 and others use 0.6, you can configure Hardhat to use compiler versions compatible with those files like this:

```js
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.5.5"
      },
      {
        version: "0.6.7",
        settings: { } 
      }
    ]
  }
}
```

This setup means that a file with a `pragma solidity ^0.5.0` will be compiled with solc 0.5.5 and a file with a `pragma solidity ^0.6.0` will be compiled with solc 0.6.7.

It might happen that a file can be compiled with more than one of your configured compilers, for example a file with `pragma solidity >=0.5.0`. In that case, the compatible compiler with the highest version will be used (0.6.7 in this example). If you don't want that to happen, you can specify for each file which compiler should be used by using overrides:

```js{4-7}
module.exports = {
  solidity: {
    compilers: [...],
    overrides: {
      "contracts/Foo.sol": {
        version: "0.5.5",
        settings: { }
      }
    }
  }
}
```

In this case, `contracts/Foo.sol` will be compiled with solc 0.5.5, no matter what's inside the `solidity.compilers` entry. 

Keep in mind that:
- Overrides are full compiler configurations, so if you have any additional settings you're using you should set them for the override as well.
- You have to use forward slashes (`/`) even if you are on Windows.

## Artifacts
 
Compiling with Hardhat generates two files per compiled contract (not each `.sol` file): an artifact and a debug file. 

An **artifact** has all the information that is necessary to deploy and interact with the contract. These are compatible with most tools, including Truffle's artifact format. Each artifact consists of a json with the following properties:

- `contractName`: A string with the contract's name.

- `abi`: A [JSON description](https://solidity.readthedocs.io/en/latest/abi-spec.html#abi-json) of the contract's ABI.

- `bytecode`: A `"0x"`-prefixed hex string of the unlinked deployment bytecode. If the contract is not deployable then, this has the `"0x"` string.

- `deployedBytecode`: A `"0x"`-prefixed hex string of the unlinked runtime/deployed bytecode. If the contract is not deployable then, this has the `"0x"` string.

- `linkReferences`: The bytecode's link references object [as returned by solc](https://solidity.readthedocs.io/en/latest/using-the-compiler.html). If the contract doesn't need to be linked, this value contains an empty object.

- `deployedLinkReferences`: The deployed bytecode's link references object [as returned by solc](https://solidity.readthedocs.io/en/latest/using-the-compiler.html). If the contract doesn't need to be linked, this value contains an empty object.


The **debug file** has all the information that is necessary to reproduce the compilation and to debug the contracts: this includes the original solc input and output, and the solc version used to compile it.

### Build info files
Hardhat optimizes compilation by compiling the smallest possible set of files at a time. Files that are compiled together have the same solc input and output. Since having this in each debug file would be meaningfully wasteful, this information is deduplicated in build info files that are placed in `artifacts/build-info`. Each contract debug file contains a relative path to its build info file, and each build info file contains the solc input, solc output and the solc version used.

You shouldn't interact with these files directly. 

### Reading artifacts

The [HRE] has an `artifacts` object with helper methods. For example, you can get a list with the paths to all artifacts by calling `hre.artifacts.getArtifactPaths()`.

You can also read an artifact using the name of the contract by calling `hre.artifacts.readArtifact("Bar")` and that will give us the content of the artifact for the `Bar` contract. This would only work if there was just one contract `Bar` in the whole project, but calling `hre.artifacts.readArtifact("Foo")`, would throw an error if there were two `Foo` contracts. To disambiguate this case, you would have to use the **Fully Qualified Name** of the contract: `hre.artifacts.readArtifact("contracts/Foo.sol:Foo")`.

### Directory structure
The `artifacts/` directory has a structure that follows the original directory structure of the contracts. For example, if your contracts look like this:

```
contracts
├── Foo.sol
├── Bar.sol
└── Qux.sol
```

the structure of your artifact directory then could look like this:

```
artifacts
└── contracts
    ├── Foo.sol
    │   ├── Foo.json
    │   ├── Foo.dbg.json
    │   ├── Foo2.json
    │   └── Foo2.dbg.json
    ├── Bar.sol
    │   ├── Bar.json
    │   └── Bar.dbg.json
    └── Qux.sol
        ├── Foo.json
        └── Foo.dbg.json
```

Each Solidity file in your source will get a directory in the artifacts structure. Each of these directories contains one artifact (`.json`) file and one debug (`.dbg.json`) file for each _contract_ in that file. `Foo.sol`, for example, contains two contracts inside.

Two Solidity files can have contracts with the same name, and this structure allows for that.

For any help or feedback you may have, you can find us in the [Hardhat Support Discord server](https://hardhat.org/discord).

[HRE]: ../advanced/hardhat-runtime-environment.md
