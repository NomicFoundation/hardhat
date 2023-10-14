# Using parameters

When you define your Ignition Modules you may want to use parameters to tweak some values during deployment.

You can do this by calling `m.getParamter`, and using its return value to define your `Future`s.

For example, we can modify the `Apollo` module from the [Quick Start guide](../getting-started/index.md#quick-start), by making the `Rocket`'s name a parameter:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

**ignition/modules/Apollo.ts**

```typescript
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Apollo", (m) => {
  const apollo = m.contract("Rocket", m.getParamter("name", "Apollo"));

  m.call(apollo, "launch", []);

  return { apollo };
});
```

:::

:::tab{value="JavaScript"}

**ignition/modules/Apollo.js**

```javascript
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("Apollo", (m) => {
  const apollo = m.contract("Rocket", m.getParamter("name", "Apollo"));

  m.call(apollo, "launch", []);

  return { apollo };
});
```

:::

::::

Now, when we deploy the module, we can provide a custom name, or use the default, `"Apollo"`.

### Defining paramteres during deployment

When you deploy a module using the `ingition deploy` task, you can also provide a JSON file with the different module parameters.

This JSON file should have an object, mapping module ids to their parameters and values.

For example, for our example above, we can create `./ignition/parameters.json` with

```json
{
  "Apollo": {
    "name": "Apollo 11"
  }
}
```

and deploy our module using it by running

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```sh
npx hardhat ignition deploy ignition/modules/Apollo.ts --parameters ignition/parameters.json
```

:::

:::tab{value="JavaScript"}

```sh
npx hardhat ignition deploy ignition/modules/Apollo.js --parameters ignition/parameters.json
```

:::

::::

which will deploy our Ignition Module, setting the `Rocket` name to `"Apollo 11"`.
