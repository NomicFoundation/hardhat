# Deploying your contracts

To deploy your contracts, we recommend using [Hardhat Ignition](/ignition), our declarative deployment system. Hardhat Ignition is now the preferred method for deploying contracts in Hardhat v3.

In the sample project, you'll find an Ignition module for deploying the `Lock` contract. An Ignition module is a TypeScript or JavaScript file that specifies what needs to be deployed.

The `LockModule` which deploys the `Lock` contract is located in the `./ignition/modules` directory and looks like this:

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

As general rule, you can target any network from your Hardhat config using:

```
npx hardhat ignition deploy ./ignition/modules/Lock.js --network <your-network>
```

If no network is specified, Hardhat Ignition will run against an in-memory instance of Hardhat Network.

In the sample `LockModule` above, two module parameters are used: `unlockTime` which will default to the 1st of Jan 2030 and `lockedAmount` which will default to one Gwei. You can learn more about overriding these values by providing your own module parameters during deployment in our [Deploying a module](/ignition/docs/guides/deploy#defining-parameters-during-deployment) guide.

Hardhat Ignition, introduced in Hardhat v3, brings several improvements to the deployment process:

1. Declarative deployments: Define your entire deployment pipeline in a single, easy-to-understand module.
2. Built-in error handling and recovery: Automatically resume deployments from where they left off if interrupted.
3. Improved testability: Easily integrate deployments into your test suite.
4. Enhanced modularity: Create reusable deployment modules for different parts of your project.

Read more about Hardhat Ignition generally in the [Hardhat Ignition documentation](/ignition).
