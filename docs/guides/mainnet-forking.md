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
      url: "https://eth-mainnet.alchemyapi.io/v2/<key>"
    }
  }
}
```

By accessing any state that exists on mainnet, Hardhat Network will pull the data and expose it transparently as if it was available locally.

## Pinning a block

Hardhat Network will by default fork from the latest mainnet block. While this might be practical depending on the context, we recommend forking from a specific block number to set up a test suite that depends on forking.

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

## Impersonating accounts

Once you've got local instances of mainnet protocols, setting them in the specific state your tests need is likely the next step. To make this easy, Hardhat Network allows you to send transactions impersonating specific account and contract addresses.

To impersonate an account use the `hardhat_impersonateAccount` RPC method passing the address to impersonate as its parameter:

```tsx
await hre.network.provider.request({
  method: "hardhat_impersonateAccount",
  params: ["0x364d6D0333432C3Ac016Ca832fb8594A8cE43Ca6"]}
)
```

Call `hardhat_stopImpersonatingAccount` to stop impersonating:

```tsx
await hre.network.provider.request({
  method: "hardhat_stopImpersonatingAccount",
  params: ["0x364d6D0333432C3Ac016Ca832fb8594A8cE43Ca6"]}
)
```

If you are using [`hardhat-ethers`](https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-ethers), call `getSigner` after impersonating the account:

```
const signer = await ethers.provider.getSigner("0x364d6D0333432C3Ac016Ca832fb8594A8cE43Ca6")
signer.sendTransaction(...)
```

## Resetting the fork

You can manipulate forking during runtime to reset back to a fresh forked state, fork from another block number or disable forking by calling `hardhat_reset`:

```ts
await network.provider.request({
  method: "hardhat_reset",
  params: [{
    forking: {
      jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/<key>",
      blockNumber: 11095000
    }
  }]
})
```

You can disable forking by passing empty params:

```ts
await network.provider.request({
  method: "hardhat_reset",
  params: []
})
```

This will reset Hardhat Network, starting a new instance in the state described [here](../hardhat-network/README.md#hardhat-network-initial-state).

## Troubleshooting

### "Project ID does not have access to archive state"

Using Infura without the archival addon you will only have access to the state of the blockchain during recent blocks. To avoid this problem, you can use a local archive node, or a service that provides archival data like [Alchemy].

[Alchemy]: https://alchemyapi.io/
