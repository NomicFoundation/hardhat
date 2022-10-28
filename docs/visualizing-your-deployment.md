# Visualizing Your Deployment

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
- Visualizing Your Deployment
  - [Actions](./visualizing-your-deployment.md#actions)
- [Testing With Hardhat](./testing-with-hardhat.md)

---

Within any **Ignition** project, you can use the `plan` task to gain a better understanding of how your deployment module connects together from one transaction to the next.

For example, using our [ENS example project](../examples/ens):

```bash
npx hardhat plan ENS.js
```

This task performs a "dry run" of the given deployment module and outputs a full HTML report that opens in your system's default browser:

![Main plan output](images/plan-1.png)

At a glance, you can easily gain a visual reference for how many contract deploys and/or calls your deployment includes as well as a hierarchy for which transactions depend on which other transactions.

If something in your deployment isn't behaving the way you expected, the `plan` task can be an extremely helpful tool for debugging and verifying that you and your code are on the same page.

## Actions

To view more details about any given transaction, simply clicking on it will navigate you to a more detailed page:

![Action detail output](images/plan-2.png)

Notice that, since this is just a dry run and not an actual deployment, any Futures passed as arguments will not have a resolved value yet. We include a placeholder for that data in the output above, and during an actual deployment that future will, of course, be replaced by the appropriate value.

Next we'll see how to use **Ignition** inside Hardhat tests

[Testing With Hardhat](./testing-with-hardhat.md)
