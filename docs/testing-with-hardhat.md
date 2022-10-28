# Testing With Hardhat

---

### Table of Contents

- [Getting Started](./getting-started-guide.md)
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
- Testing With Hardhat

---

For this guide, we'll be referring to the **Ignition** module and test inside the [simple example](../examples/simple):

```javascript
// ignition/Simple.js
const { buildModule } = require("@ignored/hardhat-ignition");

module.exports = buildModule("Simple", (m) => {
  const incAmount = m.getOptionalParam("IncAmount", 1);

  const simple = m.contract("Simple");

  m.call(simple, "inc", {
    args: [incAmount],
  });

  return { simple };
});

// test/simple.test.js
const { assert } = require("chai");
const SimpleModule = require("../ignition/Simple");

describe("Simple", function () {
  let simpleContract;

  before(async () => {
    const { simple } = await ignition.deploy(SimpleModule, {
      parameters: {
        IncAmount: 42,
      },
    });

    simpleContract = simple;
  });

  it("should return an instantiated ethers contract", async function () {
    assert.isDefined(simpleContract);
  });

  it("should have incremented the count with the deployment config call", async function () {
    assert.equal(await simpleContract.count(), 52);
  });
});
```

As you can see above, the **Ignition** Hardhat plugin makes an `ignition` instance available globally during your Mocha tests. Using this instance allows you to deploy your imported modules exactly as you would on the command line!

Since the contract instances returned from modules are resolved as ethers contracts, you can then call functions on them according to your testing needs just like you normally would.
