# Running a deployment

---

### Table of Contents

- [Visualizing your deployment with the `plan` task](./running-a-deployment.md#visualizing-your-deployment-with-the-plan-task)
- [Executing the deployment](./running-a-deployment.md#executing-the-deployment)
  - [Configuration options](./running-a-deployment.md#configuration-options)
  - [Resuming a failed or onhold deployment](./running-a-deployment.md#visualizing-your-deployment-with-the-plan-task)

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

Module parameters can be passed as a `json` string to the `parameters` flag:

```sh
npx hardhat deploy --parameters "{\"unlockTime\":4102491600,\"lockedAmount\":2000000000}" LockModule.js
```

By default the deploy task will deploy to an ephemeral Hardhat network. To target a network from your Hardhat config, you can pass its name to the network flag:

```sh
npx hardhat deploy --network mainnet LockModule.js
```

### Configuration options

There are currently some configurable options you can add to your Hardhat config file in order to adjust the way **Ignition** runs the deployment:

```tsx
interface IgnitionConfig {
  maxRetries: number;
  gasPriceIncrementPerRetry: BigNumber | null;
  pollingInterval: number; // milliseconds
  eventDuration: number; // milliseconds
}
```

These can be set within Hardhat config under the `ignition` property:

```tsx
const { ethers } = require("ethers");

module.exports = {
  ignition: {
    maxRetries: 10,
    gasPriceIncrementPerRetry: ethers.utils.parseUnits("5", "gwei"),
    pollingInterval: 300,
    eventDuration: 10000,
  },
};
```

---

#### `maxRetries`

The value of `maxRetries` is the number of times an unconfirmed transaction will be retried before considering it failed. (default value is 4)

---

#### `gasPriceIncrementPerRetry`

The value of `gasPriceIncrementPerRetry` must be an `ethers.BigNumber` and is assumed to be in wei units. This value will be added to the previous transactions gas price on each subsequent retry. However, if not given or if the given value is `null`, then the default logic will run which adds 10% of the previous transactions gas price on each retry.

---

#### `pollingInterval`

The value of `pollingInterval` is the number of milliseconds the process will wait between polls when checking if the transaction has been confirmed yet. The default value is 300 milliseconds.

---

#### `eventDuration`

This config value determines how long `m.event` waits for the given event to be emitted on-chain before marking the deployment as "on-hold". It should be given as a number of milliseconds, with the default value being 30000, or 30 seconds.

---

## Resuming a failed or onhold deployment

A run of a deployment can succeed, fail or be on hold. A failed deployment or one that is on hold, assuming it was run against a non-ephemeral network, can be rerun using the deploy command:

`npx hardhat deploy MyModule.js --network localhost`

Each run logs its events to a journal file (recorded in a sibling file to the module under `MyModule.journal.ndjson`). The journal file is used to reconstruct the state of the deployment during previous runs. Runs are scoped to the `chainId` of the network, so that runs against different networks do not interact. Any failed contract deploys or contract calls will be retried, the deployment picking up from where the last fail occurred. Any `event` invocations that had not returned and hence were on `Hold` on the last run, will be retried as well.

> **NOTE**: Changes to modules between runs of a deployment are not currently supported

To start a deployment again, ignoring the state from previous runs and rerunning the entirety of the module, the force flag can be used:

```
npx hardhat deploy MyModule.js --network localhost --force
```

For non-development network deployments, this means some form of deployment freezing will be recommended that records relevant information such as contract abi, deployed address and network. These files will be recommended to be committed into project repositories as well.
