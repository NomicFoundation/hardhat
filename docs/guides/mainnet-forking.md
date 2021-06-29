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

## Customizing Hardhat Network's behavior

Once you've got local instances of mainnet protocols, setting them in the specific state your tests need is likely the next step. Hardhat provides several RPC methods that let you modify anything about an address.

### Impersonating accounts

Hardhat Network allows you to send transactions impersonating specific account and contract addresses.

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

### Set account nonce

This method lets you change the nonce of an account. For example:

```tsx
await network.provider.send("hardhat_setNonce", [
  "0x0d2026b3EE6eC71FC6746ADb6311F6d3Ba1C000B",
  "0x21",
]);
```

This will result in account `0x0d20...000B` having a nonce of 33.

You can only use this method to increase the nonce of an account; you can't set a lower value than the account's current nonce.

### Set account balance

This method lets you change the balance of an account. For example:

```tsx
await network.provider.send("hardhat_setBalance", [
  "0x0d2026b3EE6eC71FC6746ADb6311F6d3Ba1C000B",
  "0x1000",
]);
```

This will result in account `0x0d20...000B` having a balance of 4096 wei.

### Set bytecode of an address

This method lets you set the bytecode of an address. For example:

```tsx
await network.provider.send("hardhat_setCode", [
  "0x0d2026b3EE6eC71FC6746ADb6311F6d3Ba1C000B",
  "0xa1a2a3...",
]);
```

This will result in account `0x0d20...000B` becoming a smart contract with bytecode `a1a2a3....` If that address was already a smart contract, then its code will be replaced by the specified one.

### Modify storage of contract

This method lets you modify any position in the storage of a smart contract. For example:

```tsx
await network.provider.send("hardhat_setStorageAt", [
  "0x0d2026b3EE6eC71FC6746ADb6311F6d3Ba1C000B",
  "0x0",
  "0x0000000000000000000000000000000000000000000000000000000000000001",
]);
```

This will set the first storage position inside that contract to 1.

The mapping between a smart contract's variables and its storage position is not straightforward except in some very simple cases. For example, if you deploy this contract:

```solidity
contract Foo {
  uint public x;
}
```

And you set the first storage position to 1 (as shown in the previous snippet), then calling `foo.x()` will return 1.

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
