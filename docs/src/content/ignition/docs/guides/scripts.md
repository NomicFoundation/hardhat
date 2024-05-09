# Deploying within Hardhat scripts

Hardhat Ignition is a powerful deployment engine, but you may find there are some programming concepts that are not allowed within an Ignition module. Conditional logic, `async/await`, and `console.log` of deployment variables are some examples of operations that cannot be performed within an Ignition module. However, this guide will show you how you can perform all of these operations by pairing Ignition with Hardhat scripts.

:::tip

This guide will be using the contracts and Ignition module from the [quick start guide](/ignition/docs/getting-started#quick-start).

:::

## Logging a contract's address to the console

We will begin by creating a `scripts` directory within our Hardhat project. Within this directory, create a new file called `deploy.js` (or `deploy.ts` if you're using TypeScript) and add the following code:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```typescript
import ApolloModule from "../ignition/modules/Apollo";

async function main() {
  const { apollo } = await hre.ignition.deploy(ApolloModule);

  console.log(`Apollo deployed to: ${await apollo.getAddress()}`);
}

main().catch(console.error);
```

:::

:::tab{value="JavaScript"}

```javascript
const ApolloModule = require("../ignition/modules/Apollo");

async function main() {
  const { apollo } = await hre.ignition.deploy(ApolloModule);

  console.log(`Apollo deployed to: ${await apollo.getAddress()}`);
}

main().catch(console.error);
```

:::

::::

This script imports the `Apollo` module and deploys it using `hre.ignition.deploy`. The `apollo` object in this example is an [ethers.js](https://docs.ethers.org) contract instance, which contains the deployed contract's address in the `target` property. We then log this address to the console. To run the script, execute the following command:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```sh
npx hardhat run scripts/deploy.ts
```

:::

:::tab{value="JavaScript"}

```sh
npx hardhat run scripts/deploy.js
```

:::

::::

## Asynchronous operations

For this example, let's say we want to dynamically change the name of the `Rocket` contract according to some external data. We need to make an asynchronous call to an API to retrieve this data, and we also need to adjust our Ignition module to accept this data as a parameter. First, let's update our Ignition module:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```typescript{4}
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Apollo", (m) => {
  const rocketName = m.getParameter("rocketName");
  const apollo = m.contract("Rocket", [rocketName]);

  m.call(apollo, "launch", []);

  return { apollo };
});
```

:::

:::tab{value="JavaScript"}

```javascript{4}
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("Apollo", (m) => {
  const rocketName = m.getParameter("rocketName");
  const apollo = m.contract("Rocket", [rocketName]);

  m.call(apollo, "launch", []);

  return { apollo };
});
```

:::

::::

We've added a new parameter to the Ignition module called `rocketName`. This parameter will be passed to the `Rocket` contract when it is deployed. Next, let's update our deployment script to make an asynchronous call to an API:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```typescript
import ApolloModule from "../ignition/modules/Apollo";

async function getRocketNameFromAPI() {
  // Mock function to simulate an asynchronous API call
  return "Saturn VI";
}

async function main() {
  const rocketName = await getRocketNameFromAPI();

  const { apollo } = await hre.ignition.deploy(ApolloModule, {
    parameters: { Apollo: { rocketName } },
  });

  console.log(`Apollo deployed to: ${apollo.target}`);
}

main().catch(console.error);
```

:::

:::tab{value="JavaScript"}

```javascript
const ApolloModule = require("../ignition/modules/Apollo");

async function getRocketNameFromAPI() {
  // Mock function to simulate an asynchronous API call
  return "Saturn VI";
}

async function main() {
  const rocketName = await getRocketNameFromAPI();

  const { apollo } = await hre.ignition.deploy(ApolloModule, {
    parameters: { Apollo: { rocketName } },
  });

  console.log(`Apollo deployed to: ${apollo.target}`);
}

main().catch(console.error);
```

:::

::::

In this script, we've added a new function called `getRocketNameFromAPI`, which simulates an asynchronous API call. We then call this function to retrieve the rocket name and pass it as a parameter under the named Ignition module when deploying the `Apollo` module. You can run this script using the same command as before.

:::tip

You can read more about defining and using parameters in Ignition modules in the [deployment guide](/ignition/docs/guides/deploy#defining-parameters-during-deployment).

:::

## Conditional logic

Lastly, let's add some conditional logic to our deployment script. Suppose we want to deploy the `Apollo` module only if the rocket name is not empty. We can achieve this by adding a simple `if` statement to our script:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```typescript
import ApolloModule from "../ignition/modules/Apollo";

async function getRocketNameFromAPI() {
  // Mock function to simulate an asynchronous API call
  return "Saturn VI";
}

async function main() {
  const rocketName = await getRocketNameFromAPI();

  if (rocketName !== undefined) {
    const { apollo } = await hre.ignition.deploy(ApolloModule, {
      parameters: { Apollo: { rocketName } },
    });

    console.log(`Apollo deployed to: ${await apollo.getAddress()}`);
  } else {
    console.log("No name given for Rocket contract, skipping deployment");
  }
}

main().catch(console.error);
```

:::

:::tab{value="JavaScript"}

```javascript
const ApolloModule = require("../ignition/modules/Apollo");

async function getRocketNameFromAPI() {
  // Mock function to simulate an asynchronous API call
  return "Saturn VI";
}

async function main() {
  const rocketName = await getRocketNameFromAPI();

  if (rocketName !== undefined) {
    const { apollo } = await hre.ignition.deploy(ApolloModule, {
      parameters: { Apollo: { rocketName } },
    });

    console.log(`Apollo deployed to: ${await apollo.getAddress()}`);
  } else {
    console.log("No name given for Rocket contract, skipping deployment");
  }
}

main().catch(console.error);
```

:::

::::

In this script, we've added an `if` statement to check if the `rocketName` is not `undefined`. If it is not `undefined`, we proceed with deploying the `Apollo` module; otherwise, we log a message to the console indicating that the deployment has been skipped. You can run this script using the same command as before.

By combining Hardhat Ignition with Hardhat scripts, you can perform advanced deployment operations that are not possible within an Ignition module alone. These are just a few examples of what you can achieve with this powerful combination. Feel free to experiment further and explore the possibilities!
