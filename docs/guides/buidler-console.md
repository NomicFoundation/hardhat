# Using the Buidler console

Buidler comes built-in with an interactive JavaScript console. You can use it by running `npx buidler console`:
```
$ npx buidler console
All contracts have already been compiled, skipping compilation.
>
```

The `compile` task will be called before opening the console prompt, but you can skip this with the `--no-compile` parameter.

The execution environment for the console is the same as for tasks. This means the configuration has been processed, and the [Buidler Runtime Environment] initialized and injected into the global scope. For example, that you'll have access in the global scope to the `config` object:
```
> config
{ defaultNetwork: 'buidlerevm',
  solc:
   { version: '0.5.8', optimizer: { enabled: false, runs: 200 } },
  
  ...
 
}
>
```

And the initialized `ethers` object if you're using the `buidler-ethers` plugin:
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

And the `artifacts` object if you're using the `buidler-truffle5` plugin, and so on. 

Anything that has been injected into the [Buidler Runtime Environment] will be magically available in the global scope, or if you're the more explicit kind of developer, you can also require the BRE explicitly and get autocomplete:

TODO-HH: re-run this

```
> const buidler = require("@nomiclabs/buidler")
undefined
> buidler.
buidler.__defineGetter__      buidler.__defineSetter__      buidler.__lookupGetter__      buidler.__lookupSetter__      buidler.__proto__
buidler.hasOwnProperty        buidler.isPrototypeOf         buidler.propertyIsEnumerable  buidler.toLocaleString        buidler.toString
buidler.valueOf

buidler._runTaskDefinition    buidler.constructor           buidler.injectToGlobal

buidler._extenders            buidler.hardhatArguments      buidler.config                buidler.ethereum              buidler.ethers
buidler.network               buidler.run                   buidler.tasks

>
```

You will also notice that the console has the handy history feature you expect out of most interactive terminals, including across different sessions. Try it by pressing the up arrow key.

### Asynchronous operations and top-level await

Interacting with the Ethereum network and your smart contracts are asynchronous operations, hence most APIs and libraries
use JavaScript's `Promise` for returning values.   

To make things easier, Buidler's console supports `await` top-level await (i.e. `console.log(await web3.eth.getBalance()`). To use this feature, you need to be using Node 10 or higher.

For any help or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).

[Buidler Runtime Environment]: ../advanced/buidler-runtime-environment.md
