# 7. Deploying to a live network

Once you're ready to share your dApp with other people what you may want to do is deploy to a live network. This way others can access an instance that's not running locally on your system.

There's the Ethereum network that deals with real money which is called "mainnet", and then there are other live networks that don't deal with real money but do mimic the real world scenario well, and can be used by others as a shared staging environment. These are called "testnets" and Ethereum has multiple ones: _Ropsten_, _Kovan_, _Rinkeby_ and _Goerli_. We recommend you deploy your contracts to the _Ropsten_ testnet.

At the software level, deploying to a testnet is the same as deploying to mainnet. The only difference is which network you connect to. Let's look into what the code to deploy your contracts using ethers.js would look like.

The main concepts used are `Signer`, `ContractFactory` and `Contract` which we explained back in the [testing](testing-contracts.md) section. There's nothing new that needs to be done when compared to testing, given that when you're testing your contracts you're _actually_ making a deployment to your development network. This makes the code very similar, or the same.

Let's create a new directory `scripts` inside the project root's directory, and paste the following into a `deploy.js` file:

```js
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy();

  console.log("Token address:", token.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

To indicate **Hardhat** to connect to a specific Ethereum network when running any tasks, you can use the `--network` parameter. Like this:

```
npx hardhat run scripts/deploy.js --network <network-name>
```

In this case, running it without the `--network` parameter would get the code to run against an embedded instance of **Hardhat Network**, so the deployment actually gets lost when **Hardhat** finishes running, but it's still useful to test that our deployment code works:

```
$ npx hardhat run scripts/deploy.js
Deploying contracts with the account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Account balance: 10000000000000000000000
Token address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Deploying to remote networks

To deploy to a remote network such as mainnet or any testnet, you need to add a `network` entry to your `hardhat.config.js` file. We’ll use Ropsten for this example, but you can add any network similarly:

```js{5,11,15-20}
require("@nomiclabs/hardhat-waffle");

// Go to https://www.alchemyapi.io, sign up, create
// a new App in its dashboard, and replace "KEY" with its key
const ALCHEMY_API_KEY = "KEY";

// Replace this private key with your Ropsten account private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Be aware of NEVER putting real Ether into testing accounts
const ROPSTEN_PRIVATE_KEY = "YOUR ROPSTEN PRIVATE KEY";

module.exports = {
  solidity: "0.7.3",
  networks: {
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
      accounts: [`${ROPSTEN_PRIVATE_KEY}`]
    }
  }
};
```

We're using [Alchemy](https://www.alchemyapi.io), but pointing `url` to any Ethereum node or gateway would work. Go grab your `ALCHEMY_API_KEY` and come back.

To deploy on Ropsten you need to send ropsten-ETH into the address that's going to be making the deployment. You can get some ETH for testnets from a faucet, a service that distributes testing-ETH for free. [Here's the one for Ropsten](https://faucet.ropsten.be/), you'll have to change Metamask's network to Ropsten before transacting.

::: tip

You can get some ETH for other testnets following these links:

- [Kovan faucet](https://faucet.kovan.network/)
- [Rinkeby faucet](https://faucet.rinkeby.io/)
- [Goerli faucet](https://goerli-faucet.slock.it/)

:::

Finally, run:

```
npx hardhat run scripts/deploy.js --network ropsten
```

If everything went well, you should see the deployed contract address.
