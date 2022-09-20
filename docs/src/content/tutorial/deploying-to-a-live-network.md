# 7. Deploying to a live network

Once you're ready to share your dApp with other people, you may want to deploy it to a live network. This way others can access an instance that's not running locally on your system.

The "mainnet" Ethereum network deals with real money, but there are separate "testnet" networks that do not. These testnets provide shared staging environments that do a good job of mimicking the real world scenario without putting real money at stake, and [Ethereum has several](https://ethereum.org/en/developers/docs/networks/#ethereum-testnets), like _Goerli_ and _Sepolia_. We recommend you deploy your contracts to the _Goerli_ testnet.

At the software level, deploying to a testnet is the same as deploying to mainnet. The only difference is which network you connect to. Let's look into what the code to deploy your contracts using ethers.js would look like.

The main concepts used are `Signer`, `ContractFactory` and `Contract` which we explained back in the [testing](testing-contracts.md) section. There's nothing new that needs to be done when compared to testing, given that when you're testing your contracts you're _actually_ making a deployment to your development network. This makes the code very similar, or even the same.

Let's create a new directory `scripts` inside the project root's directory, and paste the following into a `deploy.js` file in that directory:

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

To tell Hardhat to connect to a specific Ethereum network, you can use the `--network` parameter when running any task, like this:

```
npx hardhat run scripts/deploy.js --network <network-name>
```

With our current configuration, running it without the `--network` parameter would cause the code to run against an embedded instance of Hardhat Network. In this scenario, the deployment actually gets lost when Hardhat finishes running, but it's still useful to test that our deployment code works:

```
$ npx hardhat run scripts/deploy.js
Deploying contracts with the account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Account balance: 10000000000000000000000
Token address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Deploying to remote networks

To deploy to a remote network such as mainnet or any testnet, you need to add a `network` entry to your `hardhat.config.js` file. We’ll use Goerli for this example, but you can add any network similarly:

```js{5,11,15-20}
require("@nomicfoundation/hardhat-toolbox");

// Go to https://www.alchemyapi.io, sign up, create
// a new App in its dashboard, and replace "KEY" with its key
const ALCHEMY_API_KEY = "KEY";

// Replace this private key with your Goerli account private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Beware: NEVER put real Ether into testing accounts
const GOERLI_PRIVATE_KEY = "YOUR GOERLI PRIVATE KEY";

module.exports = {
  solidity: "0.8.9",
  networks: {
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
      accounts: [GOERLI_PRIVATE_KEY]
    }
  }
};
```

We're using [Alchemy](https://www.alchemyapi.io), but pointing `url` to any Ethereum node or gateway would work. Go grab your `ALCHEMY_API_KEY` and come back.

To deploy on Goerli you need to send some Goerli ether to the address that's going to be making the deployment. You can get testnet ether from a faucet, a service that distributes testing-ETH for free. Here are some for Goerli:

- [Chainlink faucet](https://faucets.chain.link/)
- [Alchemy Goerli Faucet](https://goerlifaucet.com/)

You'll have to change Metamask's network to Goerli before transacting.

:::tip

You can learn more about other testnets and find links to their faucets on the [ethereum.org site](https://ethereum.org/en/developers/docs/networks/#ethereum-testnets).

:::

Finally, run:

```
npx hardhat run scripts/deploy.js --network goerli
```

If everything went well, you should see the deployed contract address.
