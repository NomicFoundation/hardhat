# Using the Hardhat console

Hardhat comes built-in with an interactive JavaScript console. You can use it by running `npx hardhat console`:

```
$ npx hardhat console
Welcome to Node.js v12.10.0.
Type ".help" for more information.
>
```

The `compile` task will be called before opening the console prompt, but you can skip this with the `--no-compile` parameter.

The execution environment for the console is the same as for tasks and tests. This means the configuration has been processed, and the [Hardhat Runtime Environment] has been initialized and injected into the global scope.

For example, you'll have access in the global scope to the `config` object:

```
> config
{
  solidity: { compilers: [ [Object] ], overrides: {} },
  defaultNetwork: 'hardhat',
  ...
}
>
```

And if you followed the [Getting started guide](../getting-started) or installed `@nomicfoundation/hardhat-ethers`, the `ethers` object:

```
> ethers
{
  Signer: [Function: Signer] { isSigner: [Function] },
  ...
  provider: EthersProviderWrapper {
  ...
  },
  ...
  getSigners: [Function: getSigners],
  ...
  getContractAt: [Function: bound getContractAt] AsyncFunction
}
>
```

Anything that has been injected into the [Hardhat Runtime Environment] will be magically available in the global scope.

Alternatively, if you're the more explicit kind of developer, you can instead require the HRE explicitly:

```
> const hre = require("hardhat")
> hre.ethers
{
  Signer: [Function: Signer] { isSigner: [Function] },
  ...
  provider: EthersProviderWrapper {
  ...
  },
  ...
  getSigners: [Function: getSigners],
  ...
  getContractAt: [Function: bound getContractAt] AsyncFunction
}
```

### History

You will also notice that the console has the handy history feature you expect out of most interactive terminals, including across different sessions. Try it by pressing the up arrow key. The Hardhat console is just an instance of a Node.js console, so anything you use in Node.js will also work.

### Asynchronous operations and top-level await

Interacting with the Ethereum network, and therefore with your smart contracts, are asynchronous operations. Therefore, most APIs and libraries use JavaScript's `Promise` for returning values.

To make things easier, Hardhat's console supports top-level `await` statements (e.g. `console.log(await ethers.getSigners()`).

[hardhat runtime environment]: ../advanced/hardhat-runtime-environment.md
