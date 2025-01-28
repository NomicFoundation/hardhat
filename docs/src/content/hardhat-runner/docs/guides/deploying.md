# Deploying your contracts

To deploy your contracts, you can use [Hardhat Ignition](/ignition), our declarative deployment system. You can deploy the `Lock` contract from the sample project by using its accompanying Ignition module. An Ignition module is a TypeScript or JavaScript file that allows you to specify what needs to be deployed.

In the sample project, the Ignition module `LockModule` which deploys the `Lock` contract, is under the `./ignition/modules` directory and looks like this:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

<<< @/../packages/hardhat-core/sample-projects/typescript/ignition/modules/Lock.ts

:::

:::tab{value="JavaScript"}

<<< @/../packages/hardhat-core/sample-projects/javascript/ignition/modules/Lock.js

:::

::::

You can deploy in the `localhost` network following these steps:

1. Start a [local node](../getting-started/index.md#connecting-a-wallet-or-dapp-to-hardhat-network)

   ```
   npx hardhat node
   ```

2. Open a new terminal and deploy the Hardhat Ignition module in the `localhost` network

   ::::tabsgroup{options="TypeScript,JavaScript"}

   :::tab{value="TypeScript"}

   ```
   npx hardhat ignition deploy ./ignition/modules/Lock.ts --network localhost
   ```

   :::

   :::tab{value="JavaScript"}

   ```
   npx hardhat ignition deploy ./ignition/modules/Lock.js --network localhost
   ```

   :::

   ::::

As a general rule, you can target any network from your Hardhat config using:

```
npx hardhat ignition deploy ./ignition/modules/Lock.js --network <your-network>
```

If no network is specified, Hardhat Ignition will run against an in-memory instance of Hardhat Network.

In the sample `LockModule` above, two module parameters are used: `unlockTime` which will default to the 1st of Jan 2030 and `lockedAmount` which will default to one Gwei. You can learn more about overriding these values by providing your own module parameters during deployment in our [Deploying a module](/ignition/docs/guides/deploy#defining-parameters-during-deployment) guide.

Read more about Hardhat Ignition generally in the [Hardhat Ignition documentation](/ignition).
