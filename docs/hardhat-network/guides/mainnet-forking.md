# Mainnet forking

You can start an instance of Hardhat Network that forks mainnet. This means that it will simulate having the same state as mainnet, but it will work as a local development network. That way you can interact with deployed protocols and test complex interactions locally.

To use this feature you need to connect to an archive node. We recommend using [Alchemy].

## Forking from mainnet

The easiest way to try this feature is to start a node from the command line:

```
npx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/<key>
```

You can also configure Hardhat Network to always do this:

```js
networks: {
  hardhat: {
    forking: {
      url: "https://eth-mainnet.alchemyapi.io/v2/<key>";
    }
  }
}
```

(Note that you'll need to replace the `<key>` component of the URL with your personal Alchemy API key.)

By accessing any state that exists on mainnet, Hardhat Network will pull the data and expose it transparently as if it was available locally.

## Pinning a block

Hardhat Network will by default fork from the latest mainnet block. While this might be practical depending on the context, to set up a test suite that depends on forking we recommend forking from a specific block number.

There are two reasons for this:

- The state your tests run against may change between runs. This could cause your tests or scripts to behave differently.
- Pinning enables caching. Every time data is fetched from mainnet, Hardhat Network caches it on disk to speed up future access. If you don't pin the block, there's going to be new data with each new block and the cache won't be useful. We measured up to 20x speed improvements with block pinning.

**You will need access to a node with archival data for this to work.** This is why we recommend [Alchemy], since their free plans include archival data.

To pin the block number:

```js
networks: {
  hardhat: {
    forking: {
      url: "https://eth-mainnet.alchemyapi.io/v2/<key>",
      blockNumber: 11095000
    }
  }
}
```

If you are using the `node` task, you can also specify a block number with the `--fork-block-number` flag:

```
npx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/<key> --fork-block-number 11095000
```

## Customizing Hardhat Network's behavior

Once you've got local instances of mainnet protocols, setting them in the specific state your tests need is likely the next step. Hardhat Network provides several RPC methods to help you with this:

- [`hardhat_impersonateAccount`](../reference/#hardhat-impersonateaccount)
- [`hardhat_stopImpersonatingAccount`](../reference/#hardhat-stopimpersonatingaccount)
- [`hardhat_setNonce`](../reference/#hardhat-setnonce)
- [`hardhat_setBalance`](../reference/#hardhat-setbalance)
- [`hardhat_setCode`](../reference/#hardhat-setcode)
- [`hardhat_setStorageAt`](../reference/#hardhat-setstorageat)

## Resetting the fork

You can manipulate forking during runtime to reset back to a fresh forked state, fork from another block number or disable forking by calling `hardhat_reset`:

```ts
await network.provider.request({
  method: "hardhat_reset",
  params: [
    {
      forking: {
        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/<key>",
        blockNumber: 11095000,
      },
    },
  ],
});
```

You can disable forking by passing empty params:

```ts
await network.provider.request({
  method: "hardhat_reset",
  params: [],
});
```

This will reset Hardhat Network, starting a new instance in the state described [here](../reference/#initial-state).

## Using a custom hardfork history

By default, if you're forking a well-known network, Hardhat Network will automatically choose the right hardfork for the execution of your EVM code, based on known histories of public networks. If you're using a different network, you can configure Hardhat Network to know what hardforks to apply to which blocks.

For example, to configure a hardfork activation history for a network with `networkId` 99:

```js
networks: {
  hardhat: {
    forking: {
      url: "https://your.node/",
      hardforkActivationsByChain: {
        99: {
          berlin: 10000000,
          london: 20000000,
        },
      }
    }
  }
}
```

The well-known public networks are assumed when Hardhat Network is configured with a well-known chain ID (eg `1` for Ethereum mainnet), eg `networks: { hardhat: { chainId: 1 } }`.

If you're not forking a well-known network, and your config doesn't supply a hardfork history, then your code will be executed using the hardfork specified by the `hardfork` field on the Hardhat Network config, eg `networks: { hardhat: { hardfork: "london" } }`. However, if you try to run on a historical block (prior to `forking.blockNumber`), the hardfork specified in the config will not be assumed, and if you don't also supply a hardfork history then an error will be thrown.

See also [the `forking` entry in the Hardhat Network configuration reference](../reference/#forking).

## Troubleshooting

### "Project ID does not have access to archive state"

When using Infura without the archival add-on, you will only have access to the state of the blockchain from recent blocks. To avoid this problem, you can use either a local archive node or a service that provides archival data, like [Alchemy].

## See also

For full details on what's supported, see [the Hardhat Network Config Reference](../reference/#config).

[alchemy]: https://alchemyapi.io/
