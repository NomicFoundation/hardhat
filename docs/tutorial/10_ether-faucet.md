# 10. Create a Faucet

During the development and testing of contracts and dapps it is useful to modify the blockchain's state to account for previous history. For example,
in production users have Ether, which they use to pay for transactions. But in the Buidler EVM and blockchain we use for development there are
only twenty accounts that start out in Ether. We can either use those accounts (the output of `npx buidler node` includes their private keys), or transfer
"Ether" to your own account.

In this part of the tutorial we create a [Buidler task](../guides/create-task.html) that lets us transfer Ether from the Buidler console.

Create a `tasks` directory and within it a file `faucet.js`:

```js
const fs = require("fs");

// This file is only here to make interacting with the Dapp easier,
// feel free to ignore it if you don't need it.

task("faucet", "Sends ETH and tokens to an address")
  .addPositionalParam("receiver", "The address that will receive them")
  .setAction(async ({ receiver }) => {
    if (network.name === "buidlerevm") {
      console.warn(
        "You are running the facuet task with Buidler EVM network, which" +
          "gets automatically created and destroyed every time. Use the Buidler" +
          " option '--network localhost'"
      );
    }

    const addressesFile =
      __dirname + "/../frontend/src/contracts/contract-address.json";

    if (!fs.existsSync(addressesFile)) {
      console.error("You need to deploy your contract first");
      return;
    }

    const addressJson = fs.readFileSync(addressesFile);
    const address = JSON.parse(addressJson);

    if ((await ethers.provider.getCode(address.Token)) === "0x") {
      console.error("You need to deploy your contract first");
      return;
    }

    const token = await ethers.getContractAt("Token", address.Token);
    const [sender] = await ethers.getSigners();

    const tx = await token.transfer(receiver, 100);
    await tx.wait();

    const tx2 = await sender.sendTransaction({
      to: receiver,
      value: ethers.constants.WeiPerEther,
    });
    await tx2.wait();

    console.log(`Transferred 1 ETH and 100 tokens to ${receiver}`);
  });
```

- Add the following to your `buidler.config.js`:

```js{3}
usePlugin("@nomiclabs/buidler-waffle");

require("./tasks/faucet");

module.exports = {};
```

- Done! Now you are able to call the task from your terminal.

```
$ npx buidler --network localhost faucet 0x3d91185a02774c70287f6c74dd26d13dfb58ff16
Transferred 1 ETH and 100 tokens to 0x3d91185a02774c70287f6c74dd26d13dfb58ff16
```
- In the terminal where you ran `npx buidler node` you should also see: 
```
eth_sendTransaction
  Transaction:         0x674c71cd0ae04e902fb2bed6e8929743db5e446885881e82f23db02cf26af711
  From:                0x3d91185a02774c70287f6c74dd26d13dfb58ff16
  To:                  0x8cc22a7402ba40d2fca21fb76fe82432c81b9243
  Value:               1 ETH
  Gas used:            21000 of 105005
  Block #3:            0xfa0bae0a3240fffa2bd5295809cc75286a752c5ddb19b7eab911294e48f12ef7
```
