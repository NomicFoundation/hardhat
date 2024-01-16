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

Ignition Modules can define [Module Parameters](./creating-modules.md#module-parameters) and use them programmatically. When you deploy a module using the `ingition deploy` task you can provide a JSON file with their values. This section will focus on providing the parameters, while the [Module Parameters section](./creating-modules.md#module-parameters) explains how to retrieve them within a module.

An example file could be called `./ignition/parameters.json` and contain the following:

```json
{
  "Apollo": {
    "name": "Saturn V"
  }
}
```

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

## Inspecting an existing deployment

To check on the current status of a deployment, run:

```sh
npx hardhat ignition status DeploymentId
```

If you run it on the [Quick Start guide](../getting-started/index.md#quick-start) project after executing the deploying, you'd see something like this:

```
$ npx hardhat ignition status chain-31337

[ chain-31337 ] successfully deployed 🚀

Deployed Addresses

Apollo#Rocket - 0x5fbdb2315678afecb367f032d93f642f64180aa3
```
