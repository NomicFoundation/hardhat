---
next: false
prev: false
---

# MetaMask chainId issue

If you are using MetaMask with Hardhat Network, you might get an error like this when you send a transaction:

```
Incompatible EIP155-based v2710 and chain id 31337. See the second parameter of the Transaction constructor to set the chain id.
```

This is because MetaMask mistakenly assumes all networks in `http://127.0.0.1:8545` to have a chain id of `1337`, but Hardhat uses a different number by default. **Please upvote [the MetaMask issue about it](https://github.com/MetaMask/metamask-extension/issues/10290) if you want this fixed.**

In the meantime, consider using an alternative wallet that doesn't have this problem, like [Coinbase Wallet](https://www.coinbase.com/wallet).

If you want to use MetaMask, you can work around this issue by setting the `chainId` of Hardhat Network to `1337` in your Hardhat config:

```
networks: {
  hardhat: {
    chainId: 1337
  },
}
```

Note that if your setup or any of your plugins depends on the chain id being `31337`, you might need to clean your cache or make further adaptations in your config.
