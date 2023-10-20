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

## Defining parameters during deployment

Ignition Modules can define [Module Parameters](./creating-modules.md#module-parameters) and use them programmatically. When you deploy a module using the `ingition deploy` task you can provide a JSON file with their values. This section will focus on providing the parameters, while the [Module Parameters section](./creating-modules.md#module-parameters) explains how to retrieve them within a module.

An example file could be called `./ignition/parameters.json` and contain the following:

```json
{
  "Apollo": {
    "name": "Apollo 11"
  }
}
```
This makes the `name` parameter for the `Apollo` module be `"Apollo 11"`.

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
