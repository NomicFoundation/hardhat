# Using the Hardhat console

Hardhat comes built-in with an interactive JavaScript console. You can use it by running `npx hardhat console`:
```
$ npx hardhat console
All contracts have already been compiled, skipping compilation.
>
```

The `compile` task will be called before opening the console prompt, but you can skip this with the `--no-compile` parameter.

The execution environment for the console is the same as for tasks. This means the configuration has been processed, and the [Hardhat Runtime Environment] initialized and injected into the global scope. For example, that you'll have access in the global scope to the `config` object:
```
> config
{ defaultNetwork: 'hardhat',
  solc:
   { version: '0.5.8', optimizer: { enabled: false, runs: 200 } },
  
  ...
 
}
>
```

And the initialized `ethers` object if you're using the `hardhat-ethers` plugin:
```
> ethers
{ provider:
   EthersProviderWrapper {
       
  ...

  },
  getContract: [AsyncFunction: getContract],
  signers: [AsyncFunction: signers] }
>
```

And the `artifacts` object if you're using the `hardhat-truffle5` plugin, and so on. 

Anything that has been injected into the [Hardhat Runtime Environment] will be magically available in the global scope, or if you're the more explicit kind of developer, you can also require the HRE explicitly and get autocomplete:

TODO-HH: re-run this

```
> const hardhat = require("hardhat")
undefined
> hardhat.
hardhat.__defineGetter__      hardhat.__defineSetter__      hardhat.__lookupGetter__      hardhat.__lookupSetter__      hardhat.__proto__
hardhat.hasOwnProperty        hardhat.isPrototypeOf         hardhat.propertyIsEnumerable  hardhat.toLocaleString        hardhat.toString
hardhat.valueOf

hardhat._runTaskDefinition    hardhat.constructor           hardhat.injectToGlobal

hardhat._extenders            hardhat.hardhatArguments      hardhat.config                hardhat.ethereum              hardhat.ethers
hardhat.network               hardhat.run                   hardhat.tasks

>
```

You will also notice that the console has the handy history feature you expect out of most interactive terminals, including across different sessions. Try it by pressing the up arrow key.

### Asynchronous operations and top-level await

Interacting with the Ethereum network and your smart contracts are asynchronous operations, hence most APIs and libraries
use JavaScript's `Promise` for returning values.   

To make things easier, Hardhat's console supports `await` top-level await (i.e. `console.log(await web3.eth.getBalance()`). To use this feature, you need to be using Node 10 or higher.

For any help or feedback you may have, you can find us in the [Hardhat Support Discord server](https://hardhat.org/discord).

[Hardhat Runtime Environment]: ../advanced/hardhat-runtime-environment.md
