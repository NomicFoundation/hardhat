# Modifying an existing module

It's possible to make changes to modules after having deployed them.

For example, if we wanted to add a new `Rocket` contract instance to the module we deployed in the [Quick Start guide](../getting-started/index.md#quick-start), this is what we would do:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

**ignition/modules/Apollo.ts**

```typescript{8,10,12}
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Apollo", (m) => {
  const apollo = m.contract("Rocket", ["Saturn V"]);

  m.call(apollo, "launch", []);

  const artemis = m.contract("Rocket", ["Artemis 2"], { id: "artemis" });

  m.call(artemis, "launch", []);

  return { apollo, artemis };
});
```

:::

:::tab{value="JavaScript"}

**ignition/modules/Apollo.js**

```javascript{8,10,12}
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("Apollo", (m) => {
  const apollo = m.contract("Rocket", ["Saturn V"]);

  m.call(apollo, "launch", []);

  const artemis = m.contract("Rocket", ["Artemis 2"], { id: "artemis" });

  m.call(artemis, "launch", []);

  return { apollo, artemis };
});
```

:::

::::

Then run it again. Hardhat Ignition will continue from where it left off, and execute the new parts of the module.

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```sh
npx hardhat ignition deploy ignition/modules/Apollo.ts --network localhost
```

:::

:::tab{value="JavaScript"}

```sh
npx hardhat ignition deploy ignition/modules/Apollo.js --network localhost
```

:::

::::

This is what the output would look like:

```
Batch #1
  Executed Apollo#artemis

Batch #2
  Executed Apollo#Apollo.artemis.launch


[ Apollo ] successfully deployed 🚀

Deployed Addresses

Apollo#Rocket - 0x5fbdb2315678afecb367f032d93f642f64180aa3
Apollo#artemis - 0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0
```

We can see two new batches that execute the new parts of the module, while keeping the previous already deployed parts intact.

## Incompatible modifications

There are certain modifications one can make to a `Future` definition that would make the new version incompatible with the previous one _if_ the previous one has already been partially or completely executed. This would lead to Hardhat Ignition being unable to continue your deployment from where it was left off. Read the [Reconciliation](../advanced/reconciliation.md) guide to learn more about this.
