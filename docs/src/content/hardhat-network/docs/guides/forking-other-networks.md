# Forking other networks

You can start an instance of Hardhat Network that forks mainnet. This means that it will simulate having the same state as mainnet, but it will work as a local development network. That way you can interact with deployed protocols and test complex interactions locally.

To use this feature you need to connect to an archive node. We recommend using [Infura] or [Alchemy].

## Forking from mainnet

The easiest way to try this feature is to start a node from the command line:

::::tabsgroup{options=Infura,Alchemy}

:::tab{value=Infura}

```
npx hardhat node --fork https://mainnet.infura.io/v3/<key>
```

:::

:::tab{value=Alchemy}

```
npx hardhat node --fork https://eth-mainnet.g.alchemy.com/v2/<key>

```

:::

::::

You can also configure Hardhat Network to always do this:

::::tabsgroup{options=Infura,Alchemy}

:::tab{value=Infura}

```js
networks: {
  hardhat: {
    forking: {
      url: "https://mainnet.infura.io/v3/<key>",
    }
  }
}
```

:::

:::tab{value=Alchemy}

```js
networks: {
  hardhat: {
    forking: {
      url: "https://eth-mainnet.g.alchemy.com/v2/<key>",
    }
  }
}
```

:::

::::

(Note that you'll need to replace the `<key>` component of the URL with your personal Infura or Alchemy API key.)

By accessing any state that exists on mainnet, Hardhat Network will pull the data and expose it transparently as if it was available locally.

## Pinning a block

Hardhat Network will by default fork from a recent mainnet block. While this might be practical depending on the context, to set up a test suite that depends on forking we recommend forking from a specific block number.

There are two reasons for this:

- The state your tests run against may change between runs. This could cause your tests to behave differently.
- Pinning enables caching. Every time data is fetched from mainnet, Hardhat Network caches it on disk to speed up future access. If you don't pin the block, there's going to be new data with each new block and the cache won't be useful. We measured up to 20x speed improvements with block pinning.

**You will need access to a node with archival data for this to work.** This is why we recommend [Infura] or [Alchemy], since their free plans include archival data.

To pin the block number:

::::tabsgroup{options=Infura,Alchemy}

:::tab{value=Infura}

```js
networks: {
  hardhat: {
    forking: {
      url: "https://mainnet.infura.io/v3/<key>",
      blockNumber: 14390000
    }
  }
}
```

:::

:::tab{value=Alchemy}

```js
networks: {
  hardhat: {
    forking: {
      url: "https://eth-mainnet.g.alchemy.com/v2/<key>",
      blockNumber: 14390000
    }
  }
}
```

:::

::::

If you are using the `node` task, you can also specify a block number with the `--fork-block-number` flag:

::::tabsgroup{options=Infura,Alchemy}

:::tab{value=Infura}

```
npx hardhat node --fork https://mainnet.infura.io/v3/<key> --fork-block-number 14390000
```

:::

:::tab{value=Alchemy}

```
npx hardhat node --fork https://eth-mainnet.g.alchemy.com/v2/<key> --fork-block-number 14390000
```

:::

::::

## Custom HTTP headers

You can add extra HTTP headers that will be used in any request made to the forked node. One reason to do this is for authorization: instead of including your credentials in the URL, you can use a bearer token via a custom HTTP header:

```js
networks: {
  hardhat: {
    forking: {
      url: "https://ethnode.example.com",
      httpHeaders: {
        "Authorization": "Bearer <key>"
      }
    }
  }
}
```

## Impersonating accounts

Hardhat Network allows you to impersonate any address. This lets you send transactions from that account even if you don't have access to its private key.

The easiest way to do this is with the `ethers.getImpersonatedSigner` method, which is added to the `ethers` object by the [`hardhat-ethers`](/hardhat-runner/plugins/nomiclabs-hardhat-ethers) plugin:

```js
const impersonatedSigner = await ethers.getImpersonatedSigner("0x1234567890123456789012345678901234567890");
await impersonatedSigner.sendTransaction(...);
```

Alternatively, you can use the [`impersonateAccount`](</hardhat-network-helpers/docs/reference#impersonateaccount(address)>) helper and then obtain the signer for that address:

```js
const helpers = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const address = "0x1234567890123456789012345678901234567890";
await helpers.impersonateAccount(address);
const impersonatedSigner = await ethers.getSigner(address);
```

## Customizing Hardhat Network's behavior

Once you've got a local instance of the mainnet chain state, setting that state to the specific needs of your tests is likely the next step. For this, you can use our [Hardhat Network Helpers](/hardhat-network-helpers) library, which allows you to do things like manipulating the time of the network or modify the balance of an account.

## Resetting the fork

You can reset the network with the [`reset`](</hardhat-network-helpers/docs/reference#reset([url],-[blocknumber])>) network helper:

```js
const helpers = require("@nomicfoundation/hardhat-toolbox/network-helpers");

await helpers.reset(url, blockNumber);
```

Both the `url` and the `blockNumber` can be different to the ones that are currently being used by the fork.

To reset the network to a local, non-forked state, call the helper without any arguments:

```ts
await helpers.reset();
```

## Using a custom hardfork history

If you're forking an unusual network, and if you want to execute EVM code in the context of a historical block retrieved from that network, then you will need to configure Hardhat Network to know which hardforks to apply to which blocks. (If you're forking a well-known network, Hardhat Network will automatically choose the right hardfork for the execution of your EVM code, based on known histories of public networks, so you can safely ignore this section.)

To supply Hardhat Network with a hardfork activation history for your custom chain, use the `networks.hardhat.chains` config field:

```js
networks: {
  hardhat: {
    chains: {
      99: {
        hardforkHistory: {
          berlin: 10000000,
          london: 20000000,
        },
      }
    }
  }
}
```

In this context, a "historical block" is one whose number is prior to the block you forked from. If you try to run code in the context of a historical block, _without_ having a hardfork history, then an error will be thrown. The known hardfork histories of most public networks are assumed as defaults.

If you run code in the context of a _non_-historical block, then Hardhat Network will simply use the hardfork specified by the `hardfork` field on its config, eg `networks: { hardhat: { hardfork: "london" } }`, rather than consulting the hardfork history configuration.

See also [the `chains` entry in the Hardhat Network configuration reference](../reference/#chains).

## Troubleshooting

### "Project ID does not have access to archive state"

When using a node that doesn't have archival data, you will only have access to the state of the blockchain from recent blocks. To avoid this problem, you can use either a local archive node or a service that provides archival data, like [Infura] or [Alchemy].

## See also

For full details on what's supported, see [the Hardhat Network Config Reference](../reference/#config).

[infura]: https://infura.io
[alchemy]: https://alchemy.com
