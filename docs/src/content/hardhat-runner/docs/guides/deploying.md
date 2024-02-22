# Deploying your contracts

:::tip

Try [Hardhat Ignition](/ignition) for your deployments! Our new declarative system for deploying smart contracts without getting caught up in execution details.

:::

When it comes to deploying, you can use a deployment system like [Hardhat Ignition](/ignition) or you can deploy your smart contracts using scripts. You can deploy the `Lock` contract from the sample project with a deployment script like this:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

<<< @/../packages/hardhat-core/sample-projects/typescript/scripts/deploy.ts

:::

:::tab{value="JavaScript"}

<<< @/../packages/hardhat-core/sample-projects/javascript/scripts/deploy.js

:::

::::

You can deploy in the `localhost` network following these steps:

1. Start a [local node](../getting-started/index.md#connecting-a-wallet-or-dapp-to-hardhat-network)

   ```
   npx hardhat node
   ```

2. Open a new terminal and deploy the smart contract in the `localhost` network

   ::::tabsgroup{options="TypeScript,JavaScript"}

   :::tab{value="TypeScript"}

   ```
   npx hardhat run --network localhost scripts/deploy.ts
   ```

   :::

   :::tab{value="JavaScript"}

   ```
   npx hardhat run --network localhost scripts/deploy.js
   ```

   :::

   ::::

As general rule, you can target any network from your Hardhat config using:

```
npx hardhat run --network <your-network> scripts/deploy.js
```
