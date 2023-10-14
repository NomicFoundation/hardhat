# Modifying an existing module

If you have defined your modules and deployed them, you can still modify them.

If we wanted to add a new `Rocket` to the module we deployed in the [Quick Start guide](../getting-started/index.md#quick-start), all we need to do is modifying the module definition like this

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

**ignition/modules/Apollo.ts**

```typescript{8,10,12}
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Apollo", (m) => {
  const apollo = m.contract("Rocket", ["Apollo"]);

  m.call(apollo, "launch", []);

  const starship = m.contract("Rocket", ["Starship"], { id: "starship" });

  m.call(starship, "launch", []);

  return { apollo, starship };
});
```

:::

:::tab{value="JavaScript"}

**ignition/modules/Apollo.js**

```javascript{8,10,12}
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("Apollo", (m) => {
  const apollo = m.contract("Rocket", ["Apollo"]);

  m.call(apollo, "launch", []);

  const starship = m.contract("Rocket", ["Starship"], { id: "starship" });

  m.call(starship, "launch", []);

  return { apollo, starship };
});
```

:::

::::

Then, we can run it just like the first time, and Hardhat Ignition will continue from where it left

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

and we'll get a result like this

```
Batch #1
  Executed Apollo#starship

Batch #2
  Executed Apollo#Apollo.starship.launch


[ Apollo ] successfully deployed 🚀

Deployed Addresses

Apollo#Rocket - 0x5fbdb2315678afecb367f032d93f642f64180aa3
Apollo#starship - 0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0
```

with two new batches, that execute the new parts of the module, while keeping the previous results.

## Incompatible modifications

If you try to modify the definition of a `Future` that has already been partially or completely executed in an incompatible way, it may not be possible to resume your existing deployment. To learn more about this, please read the [Reconciliation](../advanced/reconciliation.md) guide.
