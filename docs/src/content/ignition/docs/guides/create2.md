# Deploying via Create2

When deploying contracts, you may want to deploy them to a specific address. This can be useful for a variety of reasons, such as deploying a contract to the same address on multiple networks. Hardhat Ignition makes this easy by allowing you to deploy your existing Ignition modules via a `create2` deployment utilizing the [CreateX factory](https://createx.rocks/).

::: tip

As is the case when using any unaudited contract system, please be aware of the [security considerations](https://github.com/pcaversaccio/createx?tab=readme-ov-file#security-considerations) of using the CreateX factory on a mainnet network.

:::

## Deploying on the Sepolia testnet

We are going to use the [Sepolia testnet](https://ethereum.org/en/developers/docs/networks/#sepolia) to deploy our Ignition module, so you need to add this network in your Hardhat config. Here we are using [Alchemy](https://alchemy.com/) to connect to the network.

:::tip

For more information on `vars` and configuration variables, please see our [configuration variables guide](../../../hardhat-runner/docs/guides/configuration-variables.md).

:::

::::tabsgroup{options=TypeScript,JavaScript}

:::tab{value=TypeScript}

```ts
// Go to https://alchemy.com, sign up, create a new App in
// its dashboard, and set the Hardhat configuration variable
// ALCHEMY_API_KEY to the key
const ALCHEMY_API_KEY = vars.get("ALCHEMY_API_KEY");

// Replace this private key with your Sepolia test account private key
// To export your private key from Coinbase Wallet, go to
// Settings > Developer Settings > Show private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Beware: NEVER put real Ether into testing accounts
const SEPOLIA_PRIVATE_KEY = vars.get("SEPOLIA_PRIVATE_KEY");

export default {
  // ...rest of your config...
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [SEPOLIA_PRIVATE_KEY],
    },
  },
};
```

:::

:::tab{value=JavaScript}

```js
// Go to https://alchemy.com, sign up, create a new App in
// its dashboard, and set the Hardhat configuration variable
// ALCHEMY_API_KEY to the key
const ALCHEMY_API_KEY = vars.get("ALCHEMY_API_KEY");

// Replace this private key with your Sepolia test account private key
// To export your private key from Coinbase Wallet, go to
// Settings > Developer Settings > Show private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Beware: NEVER put real Ether into testing accounts
const SEPOLIA_PRIVATE_KEY = vars.get("SEPOLIA_PRIVATE_KEY");

module.exports = {
  // ...rest of your config...
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [SEPOLIA_PRIVATE_KEY],
    },
  },
};
```

:::

::::

To deploy on Sepolia you need to send some Sepolia ether to the address that's going to be making the deployment. You can get testnet ether from a faucet, a service that distributes testing-ETH for free. Here is one for Sepolia:

- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)

:::tip

This guide assumes you are using the contracts and Ignition module from the [quick start guide](/ignition/docs/getting-started#quick-start), but the steps are the same for any deployment.

:::

Our last step before deploying is to add a custom salt for the deployment. This step is optional, but it's recommended to avoid any potential collisions with other deployments. You can add a custom salt via your Hardhat config:

::::tabsgroup{options=TypeScript,JavaScript}

:::tab{value=TypeScript}

```ts
export default {
  // ...rest of your config...
  ignition: {
    strategyConfig: {
      create2: {
        salt: "custom-salt",
      },
    },
  },
};
```

:::

:::tab{value=JavaScript}

```js
module.exports = {
  // ...rest of your config...
  ignition: {
    strategyConfig: {
      create2: {
        salt: "custom-salt",
      },
    },
  },
};
```

:::

::::

:::tip

To learn more about salts and how they work, as well as additional security considerations, please see the [CreateX documentation](https://github.com/pcaversaccio/createx?tab=readme-ov-file#permissioned-deploy-protection-and-cross-chain-redeploy-protection).

:::

You can now run the deployment with `create2` using the newly added Sepolia network:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```sh
npx hardhat ignition deploy ignition/modules/Apollo.ts --network sepolia --strategy create2
```

:::

:::tab{value="JavaScript"}

```sh
npx hardhat ignition deploy ignition/modules/Apollo.js --network sepolia --strategy create2
```

:::

::::

The `--strategy create2` flag tells Ignition to deploy the module using `create2`. You should see output similar to the following:

```sh
Compiled 1 Solidity file successfully (evm target: paris).
Hardhat Ignition 🚀

Deploying [ Apollo ] with strategy < create2 >

Batch #1
  Executed Apollo#Rocket

Batch #2
  Executed Apollo#Rocket.launch

[ Apollo ] successfully deployed 🚀

Deployed Addresses

Apollo#Rocket - 0x8A818FCD6dcdFCF59A1aeebB241644f256Bd19c3
```

Deploying this module using the `create2` strategy will deploy the contract to this same address, regardless of what network you're deploying to.

To read more about `create2` and the CreateX factory, please see the [CreateX documentation](https://github.com/pcaversaccio/createx).
