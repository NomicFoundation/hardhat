# 7. Deploying to a live network

Once you're ready to share your dApp with other people, you may want to deploy it to a live network. This way others can access an instance that's not running locally on your system.

The "mainnet" Ethereum network deals with real money, but there are separate "testnet" networks that do not. These testnets provide shared staging environments that do a good job of mimicking the real world scenario without putting real money at stake, and [Ethereum has several](https://ethereum.org/en/developers/docs/networks/#ethereum-testnets), like _Sepolia_ and _Goerli_. We recommend you deploy your contracts to the _Sepolia_ testnet.

At the software level, deploying to a testnet is the same as deploying to mainnet. The only difference is which network you connect to. Let's look into what the code to deploy your contracts using [Hardhat Ignition](/ignition) would look like.

In Hardhat Ignition, deployments are defined through Ignition Modules. These modules are abstractions to describe a deployment; that is, JavaScript functions that specify what you want to deploy.

Ignition modules are expected to be within the `./ignition/modules` directory. Let's create a new directory `ignition` inside the project root's directory, then, create a directory named `modules` inside of the `ignition` directory. Paste the following into a `Token.js` file in that directory:

```js
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const TokenModule = buildModule("TokenModule", (m) => {
  const token = m.contract("Token");

  return { token };
});

module.exports = TokenModule;
```

To tell Hardhat to connect to a specific Ethereum network, you can use the `--network` parameter when running any task, like this:

```
npx hardhat ignition deploy ./ignition/modules/Token.js --network <network-name>
```

With our current configuration, running it without the `--network` parameter would cause the code to run against an embedded instance of Hardhat Network. In this scenario, the deployment actually gets lost when Hardhat finishes running, but it's still useful to test that our deployment code works:

```
$ npx hardhat ignition deploy ./ignition/modules/Token.js
Compiled 1 Solidity file successfully (evm target: paris).
You are running Hardhat Ignition against an in-process instance of Hardhat Network.
This will execute the deployment, but the results will be lost.
You can use --network <network-name> to deploy to a different network.

Hardhat Ignition 🚀

Deploying [ TokenModule ]

Batch #1
  Executed TokenModule#Token

[ TokenModule ] successfully deployed 🚀

Deployed Addresses

TokenModule#Token - 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Deploying to remote networks

To deploy to a remote network such as mainnet or any testnet, you need to add a `network` entry to your `hardhat.config.js` file. We’ll use Sepolia for this example, but you can add any network. For key storage, utilize the `configuration variables`.

:::tip

For more information on `vars` and configuration variables, please see our [configuration variables guide](../hardhat-runner/docs/guides/configuration-variables.md).

:::

::::tabsgroup{options=Infura,Alchemy}

:::tab{value=Infura}

```js{4,8,16,22-23}
require("@nomicfoundation/hardhat-toolbox");

// Ensure your configuration variables are set before executing the script
const { vars } = require("hardhat/config");

// Go to https://infura.io, sign up, create a new API key
// in its dashboard, and add it to the configuration variables
const INFURA_API_KEY = vars.get("INFURA_API_KEY");

// Add your Sepolia account private key to the configuration variables
// To export your private key from Coinbase Wallet, go to
// Settings > Developer Settings > Show private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Beware: NEVER put real Ether into testing accounts
const SEPOLIA_PRIVATE_KEY = vars.get("SEPOLIA_PRIVATE_KEY");

module.exports = {
  solidity: "{RECOMMENDED_SOLC_VERSION}",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [SEPOLIA_PRIVATE_KEY],
    },
  },
};
```

:::

:::tab{value=Alchemy}

```js{4,8,16,22-23}
require("@nomicfoundation/hardhat-toolbox");

// Ensure your configuration variables are set before executing the script
const { vars } = require("hardhat/config");

// Go to https://alchemy.com, sign up, create a new App in
// its dashboard, and add its key to the configuration variables
const ALCHEMY_API_KEY = vars.get("ALCHEMY_API_KEY");

// Add your Sepolia account private key to the configuration variables
// To export your private key from Coinbase Wallet, go to
// Settings > Developer Settings > Show private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Beware: NEVER put real Ether into testing accounts
const SEPOLIA_PRIVATE_KEY = vars.get("SEPOLIA_PRIVATE_KEY");

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
- [Chainstack Sepolia Faucet](https://faucet.chainstack.com/sepolia-testnet-faucet)
- [QuickNode Sepolia Faucet](https://faucet.quicknode.com/ethereum/sepolia)

You'll have to change your wallet's network to Sepolia before transacting.

:::tip

You can learn more about other testnets and find links to their faucets on the [ethereum.org site](https://ethereum.org/en/developers/docs/networks/#ethereum-testnets).

:::

Finally, run:

```
npx hardhat ignition deploy ./ignition/modules/Token.js --network sepolia
```

If everything went well, you should see the deployed contract address.

:::tip

For more information on Hardhat Ignition, including how to verify deployments via Etherscan, check out the [Ignition documentation](/ignition).

:::
