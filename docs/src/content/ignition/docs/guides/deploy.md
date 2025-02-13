# Deploying a module

To execute your deployments, you need to use the `ignition deploy` task. It takes a path to a module file as an argument:

```sh
npx hardhat ignition deploy ignition/modules/MyModule.js
```

Hardhat Ignition will load the Ignition Module exported by the file you provided, and deploy it.

## Deployment artifact folders

Before starting to run the deployment, Hardhat Ignition will create a deployment folder under `ignition/deployments/`. By default, the folder will be named `chain-<chainId>`, where `<chainId>` depends on which network Hardhat is connected to.

You can customize the deployment folder name by providing an explicit deployment ID with `--deployment-id <id>`.

This folder will contain all the deployment results, and a journal file which records every deployment action executed, enabling recovery from errors and resuming deployments.

Read the [Deployment artifacts section](./../advanced/deployment-artifacts.md) to learn more about the files in your deployment folder.

## Extending an existing deployment

If you've previously executed a deployment and need to make adjustments, you can continue from where you left off by reusing the current deployment artifacts. Simply reconnect to the same network and keep the same deployment ID (either manually or by keeping the default).

You can add new `Future` objects to your existing Ignition Modules, and you can also add entirely new modules. All of the additions can make use of the previously existing `Future` objects and modules.

Hardhat Ignition will figure out how to pick up from where it left off last time, and continue with executing the new modifications.

## Defining parameters during deployment

Ignition Modules can define [Module Parameters](./creating-modules.md#module-parameters) and use them programmatically. When you deploy a module using the `ignition deploy` task you can provide a JSON file with their values. This section will focus on providing the parameters, while the [Module Parameters section](./creating-modules.md#module-parameters) explains how to retrieve them within a module.

An example file could be called `./ignition/parameters.json` and contain the following:

```json
{
  "Apollo": {
    "name": "Saturn V"
  }
}
```

:::tip

`JSON5` format is also supported for parameter files!

:::

This makes the `name` parameter for the `Apollo` module be `"Saturn V"`.

To execute a deployment using parameters, you need to use the `--parameters` argument, like this:

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

To pass a `bigint` as a Module parameter, you can encode it as a string. Any string parameter value that matches the regex `/d+n/` will be converted to a `bigint` before being passed to the module, for instance the `endowment` parameter in the following example:

```json
{
  "MyModule": {
    "endowment": "1000000000000000000n" // 1 ETH in wei
  }
}
```

You can also define global parameters that will be available to all modules. To do this, define a `$global` key in the parameters file:

```json
{
  "$global": {
    "shouldBeAllowed": true
  },
  "MyModule": {
    "shouldBeAllowed": false
  }
}
```

In this example, the `shouldBeAllowed` parameter will be `true` for all modules except `MyModule`, where it will be `false`. Global parameters can be accessed in the same way as module parameters.

### Module parameters when deploying via Hardhat Scripts

If you're deploying Ignition Modules via Hardhat Scripts, you can pass an absolute path to your parameters JSON file directly to the `deploy` function. Here's an example of how to do this:

```typescript
import hre from "hardhat";
import path from "path";

import ApolloModule from "../ignition/modules/Apollo";

async function main() {
  const { apollo } = await hre.ignition.deploy(ApolloModule, {
    // This must be an absolute path to your parameters JSON file
    parameters: path.resolve(__dirname, "../ignition/parameters.json"),
  });

  console.log(`Apollo deployed to: ${await apollo.getAddress()}`);
}

main().catch(console.error);
```

:::tip

You can read more about deploying and using Ignition modules in Hardhat scripts in the [scripts guide](/ignition/docs/guides/scripts).

:::

## Inspecting an existing deployment

To get a list of all the deployment IDs that exist in the current project, run:

```sh
npx hardhat ignition deployments
```

To check on the current status of a deployment, run:

```sh
npx hardhat ignition status DeploymentId
```

If you run these tasks on the [Quick Start guide](../getting-started/index.md#quick-start) project after executing the deployment, you'd see something like this:

```
$ npx hardhat ignition deployments
chain-31337
$ npx hardhat ignition status chain-31337

[ chain-31337 ] successfully deployed 🚀

Deployed Addresses

Apollo#Rocket - 0x5fbdb2315678afecb367f032d93f642f64180aa3
```
