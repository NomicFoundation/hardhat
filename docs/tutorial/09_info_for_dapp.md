# 9. Providing Contract Information for our Dapp

For a Dapp to be able to communicate with a contract on the blockchain it needs two pieces of information:

- The address of the contract
- The ABI file that specifies how to communicate with it.

To provide this information to our React Dapp we write it in the directory `frontend/src/contracts` as part of the deployment script
(`scripts/deploy.js`). To do that we use [the `fs` module](https://nodejs.org/api/fs.html).


### Preparing our Dapp

- Our Dapp will use the contract's address and artifact to interact with it
- We need to copy the generated artifact and save the address into our frontend folder
- To do so, add a method `saveFrontendFiles` to the deploy script and paste the following code:

```js

//...

function saveFrontendFiles(token) {
  const fs = require("fs");
  const contractsDir = __dirname + "/../frontend/src/contracts";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ Token: token.address }, undefined, 2)
  );

  fs.copyFileSync(
    __dirname + "/../artifacts/Token.json",
    contractsDir + "/Token.json"
  );
}

//...
```

- It will just move the contract address and the artifact into `frontend/src/contracts` directory

- Add a call to the function after the contract is deployed:

```js{9,10}
async function main() {
  
  // ...

  await token.deployed();

  console.log("Token address:", token.address);

  // We also save the contract's artifacts and address in the frontend directory
  saveFrontendFiles(token);
}
```

- Run the script again to generate the files


## Creating a token & ether faucet

- Buidler EVM comes with some accounts loaded with ETH
- When working with Metamask and localhost, you either have two options to get ether:
  - Import a development account through its private key (10000 ether by default)
  - Use one of those accounts to send some of that Ether to your Metamask account

- We'll create a faucet task that will send ether and tokens to your Metamask account.
- We won't go in depth into Buidler tasks but you can learn more about them in [our documentation](../guides/create-task.html)
- For now copy the code below and place it in a new file `faucet.js` inside a new directory called `tasks` alongside `contracts` and `test`.

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
