# Using the Hardhat console

Hardhat comes built-in with an interactive JavaScript console. You can use it by running `npx hardhat console`:

```
$ npx hardhat console
Welcome to Node.js v12.10.0.
Type ".help" for more information.
>
```

The `compile` task will be called before opening the console prompt, but you can skip this with the `--no-compile` parameter.

The execution environment for the console is the same as for tasks. This means the configuration has been processed, and the [Hardhat Runtime Environment] has been initialized and injected into the global scope. For example, you'll have access in the global scope to the `config` object:

```
> config
{
  solidity: { compilers: [ [Object] ], overrides: {} },
  defaultNetwork: 'hardhat',
  ...
}
>
```

And the initialized `ethers` object if you're using the `hardhat-ethers` plugin:

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

And the `artifacts` object if you're using the `hardhat-truffle5` plugin, and so on.

Anything that has been injected into the [Hardhat Runtime Environment] will be magically available in the global scope. Alternatively, if you're the more explicit kind of developer, you can instead require the HRE explicitly and get autocomplete:

```
> const hardhat = require("hardhat")
undefined
> hardhat.
hardhat.__defineGetter__            hardhat.__defineSetter__            hardhat.__lookupGetter__            hardhat.__lookupSetter__
hardhat.__proto__                   hardhat.hasOwnProperty              hardhat.isPrototypeOf               hardhat.propertyIsEnumerable
hardhat.toLocaleString              hardhat.toString                    hardhat.valueOf

hardhat._checkTypeValidation        hardhat._resolveArgument            hardhat._resolveValidTaskArguments  hardhat._runTaskDefinition
hardhat.constructor                 hardhat.injectToGlobal

hardhat.Web3                        hardhat._extenders                  hardhat.artifacts                   hardhat.config
hardhat.ethers                      hardhat.hardhatArguments            hardhat.network                     hardhat.run
hardhat.tasks                       hardhat.waffle                      hardhat.web3                        >
```

You will also notice that the console has the handy history feature you expect out of most interactive terminals, including across different sessions. Try it by pressing the up arrow key. The Hardhat console is just an instance of a Node.js console.

### Asynchronous operations and top-level await

Interacting with the Ethereum network, and therefore with your smart contracts, are asynchronous operations. Therefore most APIs and libraries use JavaScript's `Promise` for returning values.

To make things easier, Hardhat's console supports `await` top-level await (i.e. `console.log(await web3.eth.getBalance()`). To use this feature, you need to be using Node 10 or higher.

For any help or feedback you may have, you can find us in the [Hardhat Support Discord server](https://hardhat.org/discord).

[hardhat runtime environment]: ../advanced/hardhat-runtime-environment.md
