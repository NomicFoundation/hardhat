# 8. Deploying to localhost

To test the contracts it's enough to start a Buidler EVM, run the test, and then stop it. But now that we are communicating with a user interface we need to simulate 
the real blockchain more faithfully by leaving the EVM running. This means we need to deploy the contract we're testing with a script, rather than as part of a test.

To allow our Dapp to interact with the contract we need to deploy it to a live Buidler EVM instance. 

- When we tested our contracts, we're deploying the contracts to a different Buidler EVM instance each time. 
- This instance was created on startup and destroyed when the test task completed its execution.
- To allow our Dapp to interact with the contract, we need to deploy it to a live instance of Buidler EVM, the one we started on the previous step with `npx buidler node`.

## Creating a deploy script

- Let's look into what the code to deploy your contracts using ethers.js would look like.
- The main concepts used are `Signer`, `ContractFactory` and `Contract` which we explained back in the [testing](testing-contracts.md) section. There's nothing new that needs to be done when compared to testing, given that when you're testing your contracts you're *actually* making a deployment to your development network. This makes the code very similar, or the same.


- Let's create a new directory `scripts` inside the project root's directory, and paste the following into a `deploy.js` file:

```js
// This is a script for deploying your contracts. You can adapt it to deploy
// yours, or create new ones.
async function main() {
  // This is just a convenience check
  if (network.name === "buidlerevm") {
    console.warn(
      "You are trying to deploy a contract to the Buidler EVM network, which" +
        "gets automatically created and destroyed every time. Use the Buidler" +
        " option '--network localhost'"
    );
  }

  // ethers is avaialble in the global scope
  const [deployer] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await deployer.getAddress()
  );

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy();
  await token.deployed();

  console.log("Token address:", token.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

```

- Take a minute or so to read the script, if you followed the tutorial, it should be pretty straightforward.

- To indicate **Buidler** to connect to a specific Ethereum network when running any tasks (or scripts), you can use the `--network` parameter. Like this:

```
npx buidler run scripts/deploy.js --network <network-name>
```

- In this case, running it without the `--network` parameter would get the code to run against an embedded instance of **Buidler EVM**, so the deployment actually gets lost when **Buidler** finishes running, but it's still useful to test that our deployment code works:

```
$ npx buidler run scripts/deploy.js
All contracts have already been compiled, skipping compilation.
Deploying contracts with the account: 0xc783df8a850f42e7F7e57013759C285caa701eB6
Account balance: 10000000000000000000000
Token address: 0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F
```

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
