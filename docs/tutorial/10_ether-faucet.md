# 10. Create a Faucet

During the development and testing of contracts and dapps it is useful to modify the blockchain's state to account for previous history. For example,
in production users have Ether, which they use to pay for transactions. But in the Buidler EVM and blockchain we use for development there are
only twenty accounts that start out in Ether. We can either use those accounts (the output of `npx buidler node` includes their private keys), or transfer
ETH to your own account.

In this part of the tutorial we create a [Buidler task](../guides/create-task.html) that lets us transfer ETH from the console.

1. Create a `tasks` directory and within it a file `faucet.js`:

```js
task("faucet", "Sends ETH and tokens to an address")
  .addPositionalParam("receiver", "The address that will receive them")
  .setAction(async ({ receiver }) => {
    if (network.name === "buidlerevm") {
      console.warn("This task does not make sense without a --network parameter.\n" + 
                   "Use --network localhost.")
      return
    }    // Require a specified network


    const [sender] = await ethers.getSigners();

    const tx = await sender.sendTransaction({
      to: receiver,
      value: ethers.constants.WeiPerEther,
    })
    await tx.wait()

    console.log(`Transferred 1 ETH to ${receiver}`)
  })  // End of .setAction  
```

2. Add this line to your `buidler.config.js` file. It belongs after the `usePlugin` lines and before the `module.exports` line.

```js
require("./tasks/faucet")
```

3 Done, you can now transfer ETH to your own account

```bash
npx buidler --network localhost faucet <<your address here>>
Transferred 1 ETH and 100 tokens to 0x3d91185a02774c70287f6c74dd26d13dfb58ff16
```

In the terminal where you ran `npx buidler node` you should also see lines similar to:

```
eth_gasPrice
eth_sendTransaction
  Transaction:         0xb8628fb42f47cd3cbb506744a46413b4b45995f0c1eecee5da81027c25b19cb1
  From:                0xc783df8a850f42e7f7e57013759c285caa701eb6
  To:                  0xd02d72e067e77158444ef2020ff2d325f929b363
  Value:               1 ETH
  Gas used:            21000 of 105005
  Block #5:            0x0deb98a37a264db69c3af1e8fed1f286366c90e570e44d3337db98cc89687c8a

eth_chainId
eth_getTransactionByHash
eth_blockNumber
```

## Detailed explanation

Create a task called `faucet` with this description

```js
task("faucet", "Sends ETH and tokens to an address")
```

Add the `receiver` parameter.

```js
  .addPositionalParam("receiver", "The address that will receive them")
```

Set the action of the task. The parameters are provided as an associative array. The syntax
`({ receiver })` sets a variable called `receiver` to the value with that key.

```js
  .setAction(async ({ receiver }) => {
```


If `network.name` is `buidlerevm` it means this is an ephemeral EVM that is started just for this
task and will be terminated when it ends. In that case there is no point adding Ether to an
account on a blockchain that is going to be terminated as soon as it is done anyway.

```js
    if (network.name === "buidlerevm") {
      console.warn("This task does not make sense without a --network parameter.\n" + 
                   "Use --network localhost.")
      return
    }    // Require a specified network
```

The `ethers.getSigners()` function gives you an array of accounts. The syntax `[sender]` sets the variable `sender`
to `ethers.getSigners()[0]`.

```js
    const [sender] = await ethers.getSigners();
```

Send the ether and wait for the blockchain to process the transaction.

```js
    const tx = await sender.sendTransaction({
      to: receiver,
      value: ethers.constants.WeiPerEther,
    })
    await tx.wait()

    console.log(`Transferred 1 ETH to ${receiver}`)
  })  // End of .setAction  
```
