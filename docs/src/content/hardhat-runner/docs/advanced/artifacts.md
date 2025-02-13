# Compilation artifacts

Compiling with Hardhat generates two files per compiled contract (not each `.sol` file): an artifact and a debug file.

An **artifact** has all the information that is necessary to deploy and interact with the contract. These are compatible with most tools, including Truffle's artifact format. Each artifact consists of a json with the following properties:

- `contractName`: A string with the contract's name.

- `abi`: A [JSON description of the contract's ABI](https://solidity.readthedocs.io/en/latest/abi-spec.html#abi-json).

- `bytecode`: A `"0x"`-prefixed hex string of the unlinked deployment bytecode. If the contract is not deployable, this has the string `"0x"`.

- `deployedBytecode`: A `"0x"`-prefixed hex string of the unlinked runtime/deployed bytecode. If the contract is not deployable, this has the string `"0x"`.

- `linkReferences`: The bytecode's link references object [as returned by solc](https://solidity.readthedocs.io/en/latest/using-the-compiler.html). If the contract doesn't need to be linked, this value contains an empty object.

- `deployedLinkReferences`: The deployed bytecode's link references object [as returned by solc](https://solidity.readthedocs.io/en/latest/using-the-compiler.html). If the contract doesn't need to be linked, this value contains an empty object.

The **debug file** has all the information that is necessary to reproduce the compilation and to debug the contracts: this includes the original solc input and output, and the solc version used to compile it.

## Build info files

Hardhat optimizes compilation by compiling the smallest possible set of files at a time. Files that are compiled together have the same solc input and output. Since having this in each debug file would be meaningfully wasteful, this information is deduplicated in build info files that are placed in `artifacts/build-info`. Each contract debug file contains a relative path to its build info file, and each build info file contains the solc input, solc output and the solc version used.

You shouldn't interact with these files directly.

## Reading artifacts

The [HRE] has an `artifacts` object with helper methods. For example, you can get a list with the paths to all artifacts by calling `hre.artifacts.getArtifactPaths()`.

You can also read an artifact using the name of the contract by calling `hre.artifacts.readArtifact("Bar")`, which will return the content of the artifact for the `Bar` contract. This would only work if there was just one contract named `Bar` in the whole project; it would throw an error if there were two. To disambiguate this case, you would have to use the **Fully Qualified Name** of the contract: `hre.artifacts.readArtifact("contracts/Bar.sol:Bar")`.

## Directory structure

The `artifacts/` directory has a structure that follows the original directory structure of the contracts. For example, if your contracts look like this:

```
contracts
├── Foo.sol
├── Bar.sol
└── Qux.sol
```

then the structure of your artifact directory would look like this:

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
        ├── Qux.json
        └── Qux.dbg.json
```

Each Solidity file in your source will get a directory in the artifacts structure. Each of these directories contains one artifact (`.json`) file and one debug (`.dbg.json`) file for each _contract_ in that file. `Foo.sol`, for example, contains two contracts inside.

Two Solidity files can have contracts with the same name, and this structure allows for that.
