# Deploying with a Ledger hardware wallet

Hardhat Ignition supports deploying contracts using a Ledger hardware wallet via the `hardhat-ledger` plugin. This guide will show you how to deploy your contracts using a Ledger device.

The first step is to install the `hardhat-ledger` plugin:

::::tabsgroup{options="npm,yarn,pnpm"}

:::tab{value="npm"}

```sh
npm install --save-dev @nomicfoundation/hardhat-ledger
```

:::

:::tab{value=yarn}

```sh
yarn add --dev @nomicfoundation/hardhat-ledger
```

:::

:::tab{value="pnpm"}

```sh
pnpm add -D @nomicfoundation/hardhat-ledger
```

:::

::::

## Configuring the Ledger plugin

We are going to use the [Sepolia testnet](https://ethereum.org/en/developers/docs/networks/#sepolia) to deploy our Ignition module, so you need to add this network in your Hardhat config. Here we are using [Alchemy](https://alchemy.com/) to connect to the network. You'll also need to add the `@nomicfoundation/hardhat-ledger` plugin to your Hardhat config file and configure it for Sepolia:

::::tabsgroup{options=TypeScript,JavaScript}

:::tab{value=TypeScript}

```ts
// ...rest of your imports...
import "@nomicfoundation/hardhat-ledger";

// Go to https://alchemy.com, sign up, create a new App in
// its dashboard, and set the Hardhat configuration variable
// ALCHEMY_API_KEY to the key
const ALCHEMY_API_KEY = vars.get("ALCHEMY_API_KEY");

export default {
  // ...rest of your config...
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      ledgerAccounts: [
        // This is an example address
        // Be sure to replace it with an address from your own Ledger device
        "0xa809931e3b38059adae9bc5455bc567d0509ab92",
      ],
    },
  },
};
```

:::

:::tab{value=JavaScript}

```js
// ...rest of your imports...
require("@nomicfoundation/hardhat-ledger");

// Go to https://alchemy.com, sign up, create a new App in
// its dashboard, and set the Hardhat configuration variable
// ALCHEMY_API_KEY to the key
const ALCHEMY_API_KEY = vars.get("ALCHEMY_API_KEY");

module.exports = {
  // ...rest of your config...
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      ledgerAccounts: [
        // This is an example address
        // Be sure to replace it with an address from your own Ledger device
        "0xa809931e3b38059adae9bc5455bc567d0509ab92",
      ],
    },
  },
};
```

:::

::::

To deploy on Sepolia you need to send some Sepolia ether to the address that's going to be making the deployment. You can get testnet ether from a faucet, a service that distributes testing-ETH for free. Here is one for Sepolia:

- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [QuickNode Sepolia Faucet](https://faucet.quicknode.com/ethereum/sepolia)

:::tip

For more information on how to configure the `hardhat-ledger` plugin, check out the [plugin's documentation](../../../hardhat-runner/plugins/nomicfoundation-hardhat-ledger).

:::

## Deploying with Ledger

After configuring the plugin, you can now deploy your Hardhat Ignition module as you normally would, and Ignition will use your Ledger device to sign the transactions. For this example, we'll be deploying the `Apollo` module from the Hardhat Ignition [quick start guide](/ignition/docs/getting-started#quick-start). Ensure that your Ledger device is plugged in, unlocked, and connected to the Ethereum app, then run the deploy command:

```sh
npx hardhat ignition deploy ignition/modules/Apollo.ts --network sepolia
```

This will deploy as usual, however, you will now be prompted on your Ledger device to confirm each transaction before it's sent to the network. You should see a message like the following in your terminal:

```
Hardhat Ignition 🚀

Deploying [ Apollo ]

Batch #1
  Executing Apollo#Rocket...

  Ledger: Waiting for confirmation on device

```

At this point, you should see a prompt on your Ledger device to confirm the transaction. Once you confirm, the message will update to show that the transaction was sent to the network, and you'll see the deployment progress in your terminal.
