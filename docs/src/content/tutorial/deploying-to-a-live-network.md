# 7. Deploying to a live network

:::tip

Try [Hardhat Ignition](/ignition) for your deployments! Our new declarative system for deploying smart contracts without getting caught up in execution details.

:::

Once you're ready to share your dApp with other people, you may want to deploy it to a live network. This way others can access an instance that's not running locally on your system.

The "mainnet" Ethereum network deals with real money, but there are separate "testnet" networks that do not. These testnets provide shared staging environments that do a good job of mimicking the real world scenario without putting real money at stake, and [Ethereum has several](https://ethereum.org/en/developers/docs/networks/#ethereum-testnets), like _Sepolia_ and _Goerli_. We recommend you deploy your contracts to the _Sepolia_ testnet.

At the software level, deploying to a testnet is the same as deploying to mainnet. The only difference is which network you connect to. Let's look into what the code to deploy your contracts using ethers.js would look like.

The main concepts used are `Signer` and `Contract` which we explained back in the [testing](testing-contracts.md) section. There's nothing new that needs to be done when compared to testing, given that when you're testing your contracts you're _actually_ making a deployment to your development network. This makes the code very similar, or even the same.

Let's create a new directory `scripts` inside the project root's directory, and paste the following into a `deploy.js` file in that directory:

```js
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const token = await ethers.deployContract("Token");

  console.log("Token address:", await token.getAddress());
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
Token address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Deploying to remote networks

To deploy to a remote network such as mainnet or any testnet, you need to add a `network` entry to your `hardhat.config.js` file. We’ll use Sepolia for this example, but you can add any network similarly:

::::tabsgroup{options=Infura,Alchemy}

:::tab{value=Infura}

```js{5,11,15-20}
require("@nomicfoundation/hardhat-toolbox");

// Go to https://infura.io, sign up, create a new API key
// in its dashboard, and replace "KEY" with it
const INFURA_API_KEY = "KEY";

// Replace this private key with your Sepolia account private key
// To export your private key from Coinbase Wallet, go to
// Settings > Developer Settings > Show private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Beware: NEVER put real Ether into testing accounts
const SEPOLIA_PRIVATE_KEY = "YOUR SEPOLIA PRIVATE KEY";

module.exports = {
  solidity: "{RECOMMENDED_SOLC_VERSION}",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [SEPOLIA_PRIVATE_KEY]
    }
  }
};
```

:::

:::tab{value=Alchemy}

```js{5,11,15-20}
require("@nomicfoundation/hardhat-toolbox");

// Go to https://alchemy.com, sign up, create a new App in
// its dashboard, and replace "KEY" with its key
const ALCHEMY_API_KEY = "KEY";

// Replace this private key with your Sepolia account private key
// To export your private key from Coinbase Wallet, go to
// Settings > Developer Settings > Show private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Beware: NEVER put real Ether into testing accounts
const SEPOLIA_PRIVATE_KEY = "YOUR SEPOLIA PRIVATE KEY";

module.exports = {
  solidity: "{RECOMMENDED_SOLC_VERSION}",
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [SEPOLIA_PRIVATE_KEY]
    }
  }
};
```

:::

::::

We're using [Infura](https://infura.io) or [Alchemy](https://alchemy.com/), but pointing `url` to any Ethereum node or gateway. Go grab your API key and come back.

To deploy on Sepolia you need to send some Sepolia ether to the address that's going to be making the deployment. You can get testnet ether from a faucet, a service that distributes testing-ETH for free. Here are a few for Sepolia:

- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Coinbase Sepolia Faucet](https://coinbase.com/faucets/ethereum-sepolia-faucet) (only works if you are using the Coinbase Wallet)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)
- [Chainstack Sepolia Faucet](https://faucet.chainstack.com/sepolia-faucet)

You'll have to change your wallet's network to Sepolia before transacting.

:::tip

You can learn more about other testnets and find links to their faucets on the [ethereum.org site](https://ethereum.org/en/developers/docs/networks/#ethereum-testnets).

:::

Finally, run:

```
npx hardhat run scripts/deploy.js --network sepolia
```

If everything went well, you should see the deployed contract address.
