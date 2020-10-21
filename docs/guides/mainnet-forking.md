# Mainnet forking

You can start an instance of the Hardhat Network that forks the mainnet. This means that it will simulate having the same state as the mainnet, but it will work as a local development node. That way you can interact with deployed protocols and test complex interactions without the risk of doing it in the real mainnet.

To use this feature, the only thing you need is the URL of a node to connect to. This can be an [Infura](https://infura.io/) or [Alchemy](https://alchemyapi.io/) node, or a local one. If you don't know which to use, we recommend you use [Alchemy](https://alchemyapi.io/) 

## Forking from mainnet

The easiest way to test this feature is to start a node from the command line:

```
npx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/<key>
```

Here you have to replace `<key>` with your Alchemy key. If you are using Infura, you need a different URL, and a project id instead of a key.

You can also configure Hardhat to always do this, by setting it in the config:

```js
networks: {
  hardhat: {
    forking: {
      url: "https://eth-mainnet.alchemyapi.io/v2/<key>"
    }
  }
}
```

## Pinning a block

If you start a forked node the way we explained in the previous section, Hardhat Network will fork the mainnet from the latest block available at that moment. This has some problems.

First, it's not reproducible: you might run it at some point and it will use the block 11095000, and then run it one hour later and it will use the block 11095240. In that interval of time, the state of the blockchain will change, and this could cause your tests or scripts to behave differently.

A second problem with using the latest block number is performance. Every time the node fetches some data from the mainnet, Hardhat caches it on disk to avoid doing unnecessary requests. But if you restart your node, then this saved data is no longer useful.

The solution to both of these problems is to instruct the Hardhat Network to always fork from a given block number. In your config, it looks like this:

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

This way, every time the Hardhat Network is used, it will fork the mainnet from that block, significantly improving its performance and making it more reproducible.

If you are using the `node` task, you can also specify a block number with the `--fork-block-number` flag:

```
npx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/<key> --fork-block-number 11095000
```

If you are using Infura, keep in mind that it only lets you fetch data from recent blocks, so after a while you might get an error saying something like `Returned error: project ID does not have access to archive state`. To avoid this, use a service that lets you connect to archive nodes, like [Alchemy](https://alchemyapi.io/) or [ArchiveNode.io](https://archivenode.io/).

## Impersonating accounts

If you fork the mainnet to interact with a protocol, you probably want to simulate some conditions. For example, maybe the protocol has an owner account that can change some parameters, and you would like to do it in your forked node. You won't have the private key for doing it (and even if you do, it's not a good idea to use it in a development environment!)

The way to do this in Hardhat Network is by impersonating accounts. When you impersonate an account, you can send any transaction from it as if you had its private key. You can even send transactions from smart contract addresses.

To impersonate an account, you have to use the `hardhat_impersonateAccount` RPC method, with the address to impersonate as its parameter:

```tsx
await hre.network.provider.request({
  method: "hardhat_impersonateAccount",
  params: ["0x364d6D0333432C3Ac016Ca832fb8594A8cE43Ca6"]}
)
```

If at any point you want to stop doing it, you can use the `hardhat_stopImpersonatingAccount` method:

```tsx
await hre.network.provider.request({
  method: "hardhat_stopImpersonatingAccount",
  params: ["0x364d6D0333432C3Ac016Ca832fb8594A8cE43Ca6"]}
)
```

## Resetting the fork

You might want to reset the Hardhat Network without having to stop it, for example to start from the same state between different test fixtures. You can do this with the `hardhat_reset` method:

```ts
await network.provider.request({
  method: "hardhat_reset",
  params: [{
    forking: {
      jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/<projectId>",
      blockNumber: 11095000
    }
  }]
})
```

You can also use this method to reset the network from another block number, change the URL of the node that is being used, or even
disable the forking functionality. 

You can disable by running this:

```ts
await network.provider.request({
  method: "hardhat_reset",
  params: []
})
```

It will reset Hardhat Network, starting a new instance in the state described [here](../hardhat-network/README.md#hardhat-network-initial-state).

## Troubleshooting

### "Project ID does not have access to archive state"

As we mentioned in the ["Pinning a block"](#pinning-a-block) section, Infura only lets you have access to the state of the blockchain during recent blocks. To avoid this problem, you can use a local archive node, or a service that provides one like Alchemy or ArchiveNode.io.

### "project ID is required"

You get this error when you forget to set your project id in a Infura URL, for example if you use `https://mainnet.infura.io`.
