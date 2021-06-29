---
next: false
prev: false
---

# MetaMask chainId issue

If you are using MetaMask with Hardhat Network, you might get an error like this when you send a transaction:

```
Incompatible EIP155-based V 2710 and chain id 31337. See the second parameter of the Transaction constructor to set the chain id.
```

This is because MetaMask mistakenly assumes all networks in `http://localhost:8545` to have a chain id of `1337`, but Hardhat uses a different number by default. **Please voice your support for MetaMask to fix this on [the MetaMask issue about it](https://github.com/MetaMask/metamask-extension/issues/10290).**

In the meantime, to resolve this you can set the `chainId` of Hardhat Network to `1337` in your Hardhat config:

```
networks: {
  hardhat: {
    chainId: 1337
  },
}
```

Note that if your setup or any of your plugins depends on the chain id being `31337`, you might need to clean your cache or make further adaptations in your config.
