# Deploying your contracts

To deploy your contracts, you can use [Hardhat Ignition](/ignition), our declarative deployment system. You can deploy the `Lock` contract from the sample project by specifying a deployment with an Ignition Module file like this:

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

Read more about Hardhat Ignition in the [Hardhat Ignition documentation](/ignition).
