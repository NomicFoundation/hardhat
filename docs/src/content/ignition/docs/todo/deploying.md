# Running a deployment

Once you have built and tested your module, it is time to deploy it! Start by making sure you understand exactly what will be executed on chain.

## Visualizing your deployment with the `visualize` task

Hardhat Ignition adds a `visualize` task, that will generate an HTML report showing a _dry run_ of the deployment - the contract deploys and contract calls.

The `visualize` task takes one argument, the path to the module to visualize. For example, using the `ENS.js` module from our [ENS example project](https://github.com/NomicFoundation/hardhat-ignition/tree/main/examples/ens):

```bash
npx hardhat ignition visualize ./ignition/modules/ENS.js
```

Running `visualize` will generate the report based on the given module (in this case `ENS.js`), it will then open the report in your system's default browser:

![Main visualize output](/hardhat-ignition-images/visualize_focus.png)

The report summarises the contracts that will be deployed and the contract calls that will be made.

It shows the dependency graph as it will be executed by Hardhat Ignition (where a dependency will not be run until all its dependents have successfully completed).

If something in your deployment isn't behaving the way you expected, the `visualize` task can be an extremely helpful tool for debugging and verifying that your and Hardhat Ignition's understanding of the deployment are the same.

## Executing the deployment

Deploying a module is done using the Hardhat Ignition deploy task:

```sh
npx hardhat ignition deploy ./ignition/modules/LockModule.js
```

Module parameters can be passed as a json file. Within the json file parameter values are indexed first by the `ModuleId`, then by the parameter name:

```json
// ignition/modules/LockModule.config.json

{
  "LockModule": {
    "unlockTime": 4102491600
  }
}
```

The deploy task accepts the path to the module parameters json file via the `parameters` option:

```bash
npx hardhat ignition deploy --parameters ./ignition/modules/LockModule.config.json ./ignition/modules/LockModule.js
```

By default the deploy task will deploy to an ephemeral Hardhat network. To target a network from your Hardhat config, you can pass its name to the network flag:

```sh
npx hardhat ignition deploy ./ignition/modules/LockModule.js --network mainnet
```

### Configuration options

There are configurable options you can add to your Hardhat config file to adjust the way Hardhat Ignition runs the deployment:

```tsx
export interface DeployConfig {
  blockPollingInterval: number;
  timeBeforeBumpingFees: number;
  maxFeeBumps: number;
  requiredConfirmations: number;
}
```

These can be set within Hardhat config under the `ignition` property:

```tsx
module.exports = {
  ignition: {
    blockPollingInterval: 1_000,
    timeBeforeBumpingFees: 3 * 60 * 1_000,
    maxFeeBumps: 4,
    requiredConfirmations: 5,
  },
};
```

---

#### `blockPollingInterval`

The value of `blockPollingInterval` is the time in milliseconds between checks that a new block has been minted. The default value is 1000 milliseconds (aka 1 second).

---

#### `timeBeforeBumpingFees`

The value of `timeBeforeBumpingFees` sets the time in milliseconds to wait for a transaction to be confirmed on-chain before bumping its fee. The default is 3mins.

---

#### `maxFeeBumps`

The value of `maxFeeBumps` determines the number of times the transaction will have its fee bumped before Hardhat Ignition fails it as a timeout. The default is four.

---

#### `requiredConfirmations`

The value of `requiredConfirmations` is the number of blocks after a transaction has been confirmed to wait before Hardhat Ignition will consider the transaction as complete. This provides control over block re-org risk. The default number of confirmations is five.

---

## Source control for deployments

Hardhat Ignition creates several files when a deployment is run. You may want to commit some or all of these files to source control.

While committing the entire `deployments` directory is the recommended approach, there are some reasons why you may want to commit only some of the files: namely, repo bloat. The `deployments` directory can grow quite large, especially if you are deploying to multiple networks. At the very least, you should commit the `deployed_addresses.json` file found within each deployment directory. This file contains the addresses of all contracts deployed by the module.

You should make sure to store the rest of the files if you want to resume a deployment later.

Future versions of Ignition will make the `deployments` file system structure lighter, and friendlier to versioning.

<!-- ## Resuming a failed or onhold deployment

A run of a deployment can succeed, fail or be on hold. A failed deployment or one that is on hold, assuming it was run against a non-ephemeral network, can be rerun using the deploy command:

`npx hardhat ignition deploy MyModule.js --network localhost`

Each run logs its events to a journal file (recorded in a sibling file to the module under `MyModule.journal.ndjson`). The journal file is used to reconstruct the state of the deployment during previous runs. Runs are scoped to the `chainId` of the network, so that runs against different networks do not interact. Any failed contract deploys or contract calls will be retried, the deployment picking up from where the last fail occurred. Any `event` invocations that had not returned and hence were on `Hold` on the last run, will be retried as well.

> NOTE: Changes to modules between runs of a deployment are not currently supported

To start a deployment again, ignoring the state from previous runs and rerunning the entirety of the module, the force flag can be used:

```
npx hardhat ignition deploy MyModule.js --network localhost --force
```

For non-development network deployments, this means some form of deployment freezing will be recommended that records relevant information such as contract abi, deployed address and network. These files will be recommended to be committed into project repositories as well. -->
