# Getting Started

## Setup

This guide assumes you are starting with the Hardhat Javascript project as covered in the [Hardhat quick start](https://hardhat.org/hardhat-runner/docs/getting-started#quick-start).

```shell
$ npx hardhat
888    888                      888 888               888
888    888                      888 888               888
888    888                      888 888               888
8888888888  8888b.  888d888 .d88888 88888b.   8888b.  888888
888    888     "88b 888P"  d88" 888 888 "88b     "88b 888
888    888 .d888888 888    888  888 888  888 .d888888 888
888    888 888  888 888    Y88b 888 888  888 888  888 Y88b.
888    888 "Y888888 888     "Y88888 888  888 "Y888888  "Y888

👷 Welcome to Hardhat v2.18.0 👷‍

? What do you want to do? …
❯ Create a JavaScript project
  Create a TypeScript project
  Create an empty hardhat.config.js
  Quit
```

Add **Hardhat Ignition** to your **Hardhat** project by installing the plugin:

```bash
npm install --save-dev @nomicfoundation/hardhat-ignition
```

Modify your `hardhat.config.js` file to include **Hardhat Ignition**:

```javascript
require("@nomicfoundation/hardhat-toolbox");
// ...
require("@nomicfoundation/hardhat-ignition");
```

Create an `./ignition` folder in your project root, with a `modules` subfolder to contain your deployment modules.

```bash
mkdir ./ignition
mkdir ./ignition/modules
```

## Writing Your First Deployment Module

Add a deployment module for the example `Lock.sol` contract, under the `./ignition/modules` folder:

```js
// ./ignition/modules/LockModule.js

const { buildModule } = require("@nomicfoundation/hardhat-ignition");

const ONE_GWEI = BigInt(1_000_000_000);
const JAN_1ST_2030 = Math.round(new Date(2030, 0, 1) / 1000);

module.exports = buildModule("LockModule", (m) => {
  const unlockTime = m.getParameter("unlockTime", JAN_1ST_2030);
  const lockedAmount = m.getParameter("lockedAmount", ONE_GWEI);

  const lock = m.contract("Lock", [unlockTime], {
    value: lockedAmount,
  });

  return { lock };
});
```

### Deploying the Module

Run the `deploy` task to test the module against an ephemeral **Hardhat** node (this will use the module's default parameter values for `unlockTime` and `lockedAmout`):

```bash
npx hardhat ignition deploy LockModule
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

The deploy task accepts the path to the module parameters file via the `parameters` option:

```bash
npx hardhat ignition deploy --parameters ignition/modules/LockModule.config.json LockModule
```

To deploy against a specific network pass it via the `network` option, for instance to deploy against a local **Hardhat** node:

```bash
npx hardhat node
# in another terminal
npx hardhat ignition deploy LockModule --network localhost
```

Running against a non-ephemeral network will generate a _deployment_ stored under `./ignition/deployments`. By default an identifier is generated based on the `chainId` of the network, following the pattern `network-<CHAINID>` e.g. _network-31337_ for the localhost network.

An explicit `id` for the deployment can be given as an option to deploy:

```bash
npx hardhat ignition deploy LockModule --network localhost --id dev-deploy
```

### Getting Info About Previous Deployments

Run the `status` task to display information about your deployment. For successfully completed deployments this will show the deployed contracts:

```bash
npx hardhat ignition status --id network-31337

# 🚀 Deployment network-31337 Complete
#
# Deployed Addresses
#
# LockModule#Lock - 0x5fbdb2315678afecb367f032d93f642f64180aa3
```

### Using the Module Within Hardhat Tests

**Hardhat Ignition** modules can be used in **Hardhat** tests to simplify test setup. In the **Hardhat** quick start guide the `./test/Lock.js` test file can leverage **Hardhat Ignition** by updating the `deployOneYearLockFixture` fixture:

```js
...
const { expect } = require("chai");
const LockModule = require("../ignition/modules/LockModule");

...

  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const lockedAmount = BigInt(ONE_GWEI);
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const { lock } = await ignition.deploy(LockModule, {
      parameters: {
        LockModule: {
          unlockTime,
          lockedAmount,
        },
      },
    });

    return { lock, unlockTime, lockedAmount, owner, otherAccount };
  }
```

The **Hardhat** test command will automatically include the `ignition` object within test files when running tests:

```sh
npx hardhat test
```

---

Next, get a better understanding of the goals of **Hardhat Ignition** and how it sets out to achieve them: [Explanation](./explanation.md)
