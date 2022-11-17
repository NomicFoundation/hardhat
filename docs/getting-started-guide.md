# Getting Started

---

### Table of Contents

- Getting Started
  - [Setup](./getting-started-guide.md#setup)
  - [Writing Your First Deployment Module](./getting-started-guide.md#writing-your-first-deployment-module)
- [Creating Modules for Deployment](./creating-modules-for-deployment.md)
  - [Deploying a Contract](./creating-modules-for-deployment.md#deploying-a-contract)
  - [Executing a Method on a Contract](./creating-modules-for-deployment.md#executing-a-method-on-a-contract)
  - [Using the Network Chain ID](./creating-modules-for-deployment.md#using-the-network-chain-id)
  - [Module Parameters](./creating-modules-for-deployment.md#module-parameters)
  - [Modules Within Modules](./creating-modules-for-deployment.md#modules-within-modules)
- [Visualizing Your Deployment](./visualizing-your-deployment.md)
  - [Actions](./visualizing-your-deployment.md#actions)
- [Testing With Hardhat](./testing-with-hardhat.md)

---

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

👷 Welcome to Hardhat v2.9.9 👷‍

? What do you want to do? …
❯ Create a JavaScript project
  Create a TypeScript project
  Create an empty hardhat.config.js
  Quit
```

Add **Ignition** to your **Hardhat** project by installing the plugin:

```bash
npm install @ignored/hardhat-ignition
```

Modify your `hardhat.config.js` file, to include **Ignition**:

```javascript
require("@nomicfoundation/hardhat-toolbox");
// ...
require("@ignored/hardhat-ignition");
```

Create an `./ignition` folder in your project root to contain your deployment modules.

```bash
mkdir ./ignition
```

## Writing Your First Deployment Module

Add a deployment module under the `./ignition` folder for the example `Lock.sol` contract:

```js
// ./ignition/LockModule.js
const { buildModule } = require("@ignored/hardhat-ignition");

const currentTimestampInSeconds = Math.round(Date.now() / 1000);
const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
const ONE_YEAR_IN_FUTURE = currentTimestampInSeconds + ONE_YEAR_IN_SECS;

const ONE_ETHER = hre.ethers.utils.parseEther("1");

module.exports = buildModule("LockModule", (m) => {
  const unlockTime = m.getOptionalParam("unlockTime", ONE_YEAR_IN_FUTURE);
  const lockedAmount = m.getOptionalParam("lockedAmount", ONE_ETHER);

  const lock = m.contract("Lock", { args: [unlockTime], value: lockedAmount });

  return { lock };
});
```

Run the `deploy` task to test the module against an ephemeral **Hardhat** node (using the default `unlockTime`):

```bash
npx hardhat deploy LockModule.js
```

A relative path to a file containing module parameters can be passed as a flag at the command line:

```json
// ignition/LockModule.config.json
{
  "unlockTime": 4102491600
}
```

```bash
npx hardhat deploy --parameters ignition/LockModule.config.json LockModule.js
```

Parameters can also be passed at the command line via a json string:

```bash
npx hardhat deploy --parameters "{\"unlockTime\":4102491600,\"lockedAmount\":2000000000}" LockModule.js
# Ensure you have properly escaped the json string
```

To deploy against a local hardhat node:

```bash
npx hardhat node
# in another terminal
npx hardhat deploy --network localhost LockModule.js
```

Next, dig deeper into defining modules:

[Creating modules for deployment](./creating-modules-for-deployment.md)
