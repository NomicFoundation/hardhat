# Using the Budiler console

Budiler comes built-in with a REPL interactive JavaScript console. You can use it by running `npx buidler console`:
```
$ npx buidler console
All contracts have already been compiled, skipping compilation.
>
```

The `compile` task will be called before opening the console prompt, but you can skip this with the `--no-compile` parameter.

The execution environment for the console is the same as for tasks. This means the configuration has been processed, the [Buidler Runtime Environment] initialized and injected into the global scope. This means, for example, that you'll have access in the global scope to the `config` object:
```
> config
{ defaultNetwork: 'develop',
  solc:
   { version: '0.5.8', optimizer: { enabled: false, runs: 200 } },
  networks: { develop: { url: 'http://127.0.0.1:8545' } },
  analytics: { enabled: true },
  mocha: { timeout: 20000 },
  paths:
   { root: '/Users/fzeoli/Work/nomic/Buidler/throwaway/waffle-guide',
     configFile:
      '/Users/fzeoli/Work/nomic/Buidler/console-guide/buidler.config.js',
     sources:
      '/Users/fzeoli/Work/nomic/Buidler/console-guide/contracts',
     cache:
      '/Users/fzeoli/Work/nomic/Buidler/console-guide/cache',
     artifacts:
      '/Users/fzeoli/Work/nomic/Buidler/console-guide/artifacts',
     tests:
      '/Users/fzeoli/Work/nomic/Buidler/console-guide/test' } }
>
```

And the initialized `ethers` object if you're using the `buidler-ethers` plugin:
```
> ethers
{ provider:
   EthersProviderWrapper {
     ready: Promise { <pending>, domain: [Domain] },
     _lastBlockNumber: -2,
     _balances: {},
     _events: [],
     _pollingInterval: 4000,
     _emitted: { block: -2 },
     _fastQueryDate: 0,
     connection: { url: 'http://localhost:8545' },
     _buidlerProvider:
      HttpProvider {
        domain: [Domain],
        _events: [Object: null prototype] {},
        _eventsCount: 0,
        _maxListeners: undefined,
        _url: 'http://127.0.0.1:8545',
        _networkName: 'develop',
        _extraHeaders: {},
        _timeout: 20000,
        _nextRequestId: 1 } },
  getContract: [AsyncFunction: getContract],
  signers: [AsyncFunction: signers] }
>
```

And the `artifacts` object if you're using the `buidler-truffle5` plugin, and so on. Anything that has been injected into the [Buidler Runtime Environment] will be available magically in the global scope, or if you're the more explicit kind of developer, you can also require the BRE explicitely and get autocomplete:
```
> const buidler = require("@nomiclabs/buidler")
undefined
> buidler.
buidler.__defineGetter__      buidler.__defineSetter__      buidler.__lookupGetter__      buidler.__lookupSetter__      buidler.__proto__
buidler.hasOwnProperty        buidler.isPrototypeOf         buidler.propertyIsEnumerable  buidler.toLocaleString        buidler.toString
buidler.valueOf

buidler._runTaskDefinition    buidler.constructor           buidler.injectToGlobal

buidler._extenders            buidler.buidlerArguments      buidler.config                buidler.ethereum              buidler.ethers
buidler.network               buidler.run                   buidler.tasks

>
```

You will also notice that the console has the handy history feature you expect out of most interactive terminals. Try it by pressing the up arrow key.

To use top-level await (i.e. `console.log(await web3.eth.getBalance()`) in the console you will node Node >10, otherwise you can use the Promise API (i.e. `getBalance().then(console.log)`)

For any help or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).

[Buidler Runtime Environment]: /reference/#buidler-runtime-environment-bre