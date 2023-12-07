# Deploying your contracts

To deploy your contracts, you can use [Hardhat Ignition](/ignition), our declarative deployment system. You can find a sample Hardhat Ignition module inside the `ignition/modules` directory of the sample project:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

<<< @/../packages/hardhat-core/sample-projects/typescript/ignition/modules/LockModule.ts

:::

:::tab{value="JavaScript"}

<<< @/../packages/hardhat-core/sample-projects/javascript/ignition/modules/LockModule.js

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
   npx hardhat ignition deploy ./ignition/modules/LockModule.ts --network localhost
   ```

   :::

   :::tab{value="JavaScript"}

   ```
   npx hardhat ignition deploy ./ignition/modules/LockModule.js --network localhost
   ```

   :::

   ::::

As general rule, you can target any network from your Hardhat config using:

```
npx hardhat ignition deploy ./ignition/modules/LockModule.js --network <your-network>
```

Alternatively, you can also deploy to an ephemeral instance of the Hardhat Network by running the command without the `--network` parameter:

```
npx hardhat ignition deploy ./ignition/modules/LockModule.js
```

Read more about Hardhat Ignition in the [Ignition documentation](/ignition).
