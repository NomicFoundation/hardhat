# Running a deployment

---

### Table of Contents

- [Visualizing your deployment with the `plan` task](./running-a-deployment.md#visualizing-your-deployment-with-the-plan-task)
- [Executing the deployment](./running-a-deployment.md#executing-the-deployment)
  - [Configuration options](./running-a-deployment.md#configuration-options)
  <!-- - [Resuming a failed or onhold deployment](./running-a-deployment.md#visualizing-your-deployment-with-the-plan-task) -->

---

Once you have built and tested your deployment module, it is time to deploy it! Start by making sure you understand exactly what will be executed on chain.

## Visualizing your deployment with the `plan` task

**Ignition** adds a `plan` task to the cli, that will generate a HTML report showing a _dry run_ of the deployment - the contract deploys and contract calls.

The `plan` task takes one argument, the module to visualize. For example, using the `ENS.js` module from our [ENS example project](../examples/ens/README.md):

```bash
npx hardhat plan ENS
```

Running `plan` will generate the report based on the given module (in this case `ENS.js`), it will then open the report in your system's default browser:

![Main plan output](images/plan-1.png)

The report summarises the contract that will be deployed and the contract calls that will be made.

It shows the dependency graph as it will be executed by Ignition (where a dependency will not be run until all its dependents have successfully completed).

If something in your deployment isn't behaving the way you expected, the `plan` task can be an extremely helpful tool for debugging and verifying that your and **Ignition**'s understanding of the deployment are the same.

## Executing the deployment

Deploying a module is done using the **Ignition** deploy task:

```sh
npx hardhat deploy LockModule
```

Module parameters, indexed by `ModuleId`, can be passed as a `json` string to the `parameters` flag:

```sh
npx hardhat deploy --parameters "{\"LockModule\": {\"unlockTime\":4102491600,\"lockedAmount\":2000000000}}" LockModule.js
```

By default the deploy task will deploy to an ephemeral Hardhat network. To target a network from your Hardhat config, you can pass its name to the network flag:

```sh
npx hardhat deploy LockModule.js --network mainnet
```

### Configuration options

There are configurable options you can add to your Hardhat config file to adjust the way **Ignition** runs the deployment:

```tsx
export interface DeployConfig {
  blockPollingInterval: number;
  transactionTimeoutInterval: number;
  blockConfirmations: number;
}
```

These can be set within Hardhat config under the `ignition` property:

```tsx
const { ethers } = require("ethers");

module.exports = {
  ignition: {
    blockPollingInterval: 200,
    transactionTimeoutInterval: 3 * 60 * 1000,
    blockConfirmations: 5,
  },
};
```

---

#### `blockPollingInterval`

The value of `blockPollingInterval` is the time in milliseconds between checks that a new block has been minted. The default value is 1000 milliseconds (aka 1 second).

---

#### `transactionTimeoutInterval`

The value of `transactionTimeoutInterval` sets the time in milliseconds to wait for a transaction to be confirmed on-chain before setting it as timed out for this deployment run. The default is 3mins.

---

#### `blockConfirmations`

The value of `blockConfirmations` is the number of blocks after a transaction has been confirmed to wait before Ignition will consider the transaction as complete. This provides control over block re-org risk. The default number of confirmations is five.

---

<!-- ## Resuming a failed or onhold deployment

A run of a deployment can succeed, fail or be on hold. A failed deployment or one that is on hold, assuming it was run against a non-ephemeral network, can be rerun using the deploy command:

`npx hardhat deploy MyModule.js --network localhost`

Each run logs its events to a journal file (recorded in a sibling file to the module under `MyModule.journal.ndjson`). The journal file is used to reconstruct the state of the deployment during previous runs. Runs are scoped to the `chainId` of the network, so that runs against different networks do not interact. Any failed contract deploys or contract calls will be retried, the deployment picking up from where the last fail occurred. Any `event` invocations that had not returned and hence were on `Hold` on the last run, will be retried as well.

> **NOTE**: Changes to modules between runs of a deployment are not currently supported

To start a deployment again, ignoring the state from previous runs and rerunning the entirety of the module, the force flag can be used:

```
npx hardhat deploy MyModule.js --network localhost --force
```

For non-development network deployments, this means some form of deployment freezing will be recommended that records relevant information such as contract abi, deployed address and network. These files will be recommended to be committed into project repositories as well. -->
