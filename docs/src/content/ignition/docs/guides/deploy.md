# Deploying a module

All you need to do to run a deployment is running

```sh
npx hardhat igntion deploy ignition/modules/MyModule.js
```

When you run this task, Hardhat Ignition loads an Ignition Module exported by the file you provided, and deploys it.

## Deployment folders

Before starting to run the deployment, Hardhat Ignition will create a deployment folder under `ignition/deployments/`. By default, the folder will be named `chain-<chainId>`, where `<chainId>` depends on which network Hardhat is connected to.

You can customize the deployment folder name by provided an explicit deployment id with `--deployment-id <id>`.

The deployment folder will contain any deployment result, and a journal file with all the actions Hardhat Ignition takes, so that it can recover from errors and resume existing deployments.

To learn more about the files in your deployment folder, read the [Deployment artifacts section](./../advanced/deployments.md).

## Reusing an existing deployment

You can reuse an existing deployment folder by connecting to the same network and using the default deployment id or providing the same one.

When you do this, you can deploy new modules. This new modules can import your existing ones if needed.

Hardhat Ignition will know how to take over from where it left the previous deployment, and continue with the execution.

## Defining paramteres during deployment

Ignition Modules can define [Module Parameters](./creating-modules.md#module-parameters) and use them to define their `Future`s. When you deploy a module using the `ingition deploy` task, you can provide a JSON file with their values. This allows you to customize some values during deployment.

This JSON file should have an object, mapping module ids to their parameters and values.

For example, we can modify the `Apollo` module from the [Quick Start guide](../getting-started/index.md#quick-start), by making the `Rocket`'s name a parameter:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

**ignition/modules/Apollo.ts**

```typescript
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Apollo", (m) => {
  const apollo = m.contract("Rocket", m.getParamter("name", "Apollo"));

  m.call(apollo, "launch", []);

  return { apollo };
});
```

:::

:::tab{value="JavaScript"}

**ignition/modules/Apollo.js**

```javascript
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("Apollo", (m) => {
  const apollo = m.contract("Rocket", m.getParamter("name", "Apollo"));

  m.call(apollo, "launch", []);

  return { apollo };
});
```

:::

::::

Then create `./ignition/parameters.json` with

```json
{
  "Apollo": {
    "name": "Apollo 11"
  }
}
```

and deploy our module using it by running

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```sh
npx hardhat ignition deploy ignition/modules/Apollo.ts --parameters ignition/parameters.json
```

:::

:::tab{value="JavaScript"}

```sh
npx hardhat ignition deploy ignition/modules/Apollo.js --parameters ignition/parameters.json
```

:::

::::

which will deploy `Rocket` with the name `"Apollo 11"`.

## Inspecting an existing deployment

Hardhat Ignition provides a task to understand the current status of an existing deployment. To use it, you should run

```sh
npx hardhat ignition status DeploymentId
```

For example, if we run it with the deployment from the [Quick Start guide](../getting-started/index.md#quick-start), we'd get something like this

```
$ npx hardhat ignition status chain-31337

[ chain-31337 ] successfully deployed 🚀

Deployed Addresses

Apollo#Rocket - 0x5fbdb2315678afecb367f032d93f642f64180aa3
```
