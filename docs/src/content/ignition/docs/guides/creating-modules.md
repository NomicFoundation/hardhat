# Creating Ignition Modules

In Hardhat Ignition, deployments are defined through Ignition Modules. These modules help you outline and describe the system that you want to deploy. Each Ignition Module encapsulates a group of smart contract instances and operations within your system.

This guide will explain how to create Ignition Modules.

## The module definition API

To create an Ignition Module, import the `buildModule` function from `@nomicfoundation/hardhat-ignition/modules`. Then, call it with a `string` that will be used as the module ID, and a callback that will define the content of the module.

This is a module which will be identified as `"MyToken"`:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```typescript
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MyToken", (m) => {
  const token = m.contract("Token", ["My Token", "TKN", 18]);

  return { token };
});
```

:::

:::tab{value="JavaScript"}

```javascript
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("My token", (m) => {
  const token = m.contract("Token", ["My Token", "TKN", 18]);

  return { token };
});
```

:::

::::

You can create multiple modules in a single file, but each must have a unique ID. To deploy a module, you must export it using `module.exports =` or `export default`. As a best practice, we suggest maintaining one module per file, naming the file after the module ID.

The callback function is where the module definition actually happens. The `m` parameter being passed into the callback is an instance of a `ModuleBuilder`, which is an object with methods to define and configure your smart contract instances.

When we call these `ModuleBuilder` methods, they create a `Future` object, which represents the result of an execution step that Hardhat Ignition needs to run to deploy a contract instance or interact with an existing one.

This doesn't execute anything against the network, it simply represents it internally. After the `Future` is created, it gets registered within the module, and the method returns it.

To deploy a module, Hardhat Ignition executes each of the `Future` objects that the module defines once, and stores the results.

Finally, the module definition callback can return `Future` objects that represent contract instances, making these contracts accessible to other modules and tests, just like we returned `token` in our example.

## The different kinds of `Future`

This section will explore the different kinds of `Future` objects that Hardhat Ignition supports, and how to define them using `ModuleBuilder`.

### Deploying a contract

As explained above, to define a new contract instance you'll have to use `m.contract` to create a `Future`.

Hardhat Ignition knows all the contracts you have in your Hardhat project, so you can refer to them by their names like you would when you're writing tests.

Let's go over the example again:

```js
const token = m.contract("Token", ["My Token", "TKN", 18]);
```

We call `m.contract` and provide the contract name as the first argument. Then we provide an array of arguments that the constructor needs.

If you want to use the future value that a `Future` object represents as an argument for another method call, you can simply use the `Future` object itself. Hardhat Ignition will figure out how to resolve it during execution.

For example, we can use the address of `token` like this:

```js
const foo = m.contract("ReceivesAnAddress", [token]);
```

If you need to send ETH to the constructor, you can pass an object with options as the third argument to `m.contract`, and put in how much you want to send in the `value` field:

```js
const bar = m.contract("ReceivesETH", [], {
  value: 1_000_000_000n, // 1gwei
});
```

### Using an existing contract

If you need to interact with existing contract instances, you can create a `Future` to represent it in your module like this:

```js
const existingToken = m.contractAt("Token", "0x...");
```

Just like with `m.contract`, the first value is the name of the contract, and the second value is its address.

You can also use another `Future` for the address (the second argument). This can be useful when using a factory, or to create a contract `Future` with a different interface (like when deploying a proxy and instantiating it as its implementation).

### Calling contract functions

To call a function of a contract you need to use the `m.call` method in `ModuleBuilder`:

```js
m.call(token, "transfer", [receiver, amount]);
```

The first argument is the `Future` object for the contract you want to call, the second one the function name, and the third one is an array of arguments. Once again, the array of arguments can contain other `Future` objects and Hardhat Ignition will figure out how to resolve them during execution.

In this example, the `m.call` returns a `Future` which we aren't assigning to any variable. This isn't a problem. Hardhat Ignition will execute every `Future` within a module, regardless of whether we store it or not.

If you need to send ETH while calling a function, you can pass an object with options as the third argument to `m.contract`, and put in how much you want to send in the `value` field:

```js
m.call(myContract, "receivesEth" [], {
  value: 1_000_000_000n, // 1gwei
});
```

### Reading a value from a contract

If you need to call a `view` or `pure` function in a contract to retrieve a value, you can do it with `m.staticCall`:

```js
const balance = m.staticCall(token, "balanceOf", [address]);
```

Just like with `m.call`, the `m.staticCall` method requires you to provide the contract's `Future` object, the function name, and its arguments. It returns a `Future` representing the value returned by the contract call.

If the function you are calling returns more than one value, `m.staticCall` will return the first one by default. If you need a value other than the first one, you can provide an index or name as the fourth parameter.

To execute this `Future`, Hardhat Ignition won't send any transactions and it will use [`eth_call`](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_call) instead. Just like every other `Future`, it gets executed once, and the result is recorded.

### Reading values from events emitted during `Future` execution

If you're dealing with a `Future` that emits a Solidity event when executed, and you need to extract an argument from said event, then you can use `m.readEventArgument`:

```tsx
const transfer = m.call(token, "transfer", [receiver, amount]);

const value = m.readEventArgument(transfer, "Transfer", "_value");
```

The first parameter is the `Future` object, whose execution results in the event's emission. Next, you specify the event's name and the particular argument you wish to extract from this event, using either its index or name for identification.

You can also provide as a fourth parameter an object with options, which can contain:

- `emitter`: A `Future` representing the contract instance that **directly emits** the event. This defaults to the `Future` you pass as first argument, but they’re not always the same. A `Future` can be executed and indirectly lead to an event emission by calling other contracts during its execution, which then directly emit the event.

- `eventIndex`: If the are multiple events with the same name emitted by the `emitter`, you can use this parameter to pick one of them. It defaults to `0`.

### Sending ETH or data to an account

To send ETH or data to an account you can use `m.send`:

```js
const send = m.send("SendingEth", address, 1_000_000n);
const send = m.send("SendingData", address, undefined, "0x16417104");
```

Calling `m.send` will create a `Future` representing the sending action. The first parameter it requires is the ID for the `Future` that will be created.

The second argument is the address of the account where you want to send the ETH or data to.

The third and fourth parameters are both optional. They represent the amount of ETH and the data to be sent.

### Deploying a library

To deploy a library you can use `m.library`:

```js
const myLib = m.library("MyLib");
```

If you need to link libraries take a look at the [Linking Libraries](#linking-libraries) section.

## `Future` IDs

Each `Future` that is created should have a unique ID. In most cases, Hardhat Ignition will automatically generate an ID for every `Future` you create, based on the creation parameters.

In some cases, this automatic process may lead to an ID clash with an existing `Future`. If that happens, Hardhat Ignition won't try to resolve the clash, and you will need to define an ID manually to resolve the issue. Every method of `ModuleBuilder` accepts an options object as last argument, which has an `id` field that can be used like this:

```js
const token = m.contract("Token", ["My Token 2", "TKN2", 18], {
  id: "MyToken2",
});
```

The `Future` IDs are used to organize your deployment results, artifacts, and to resume a deployment after interruptions or modifications. For this reason, you should avoid changing IDs after running a deployment.

## Dependencies between `Future` objects

If you provide a `Future` object `A` as an argument when constructing `Future` object `B`, a dependency from `B` to `A` is created.

Dependencies are used by Hardhat Ignition to understand how to order and batch the execution of the different `Future` objects.

You also have the option to set explicit dependencies between `Future` objects. This is done through the `after` field in the options object, accepted by all `ModuleBuilder` methods when creating a `Future`. Here's how you can do it:

```js
const token = m.contract("Token", ["My Token", "TKN", 18]);

const receiver = m.contract("Receiver", [], {
  after: [token], // `receiver` is deployed after `token`
});
```

## Module parameters

When defining Ignition Modules, you can use configurable parameters for flexibility.

During deployment, you can specify these parameters in a JSON file that maps module IDs with respective parameter names and values. This section will focus on retrieving parameters, while the [Defining parameters during deployment](./deploy.md#defining-parameters-during-deployment) section explains how to provide them.

To access these values, you can call `m.getParameter` providing the name for the parameter as the first argument. You can also make your parameters optional by providing a second argument to `m.getParameter` which will act as the default value in case the parameter isn't provided.

For example, we can modify the `Apollo` module from the [Quick Start guide](../getting-started/index.md#quick-start) to make the `name` field in the `Rocket` smart contract configurable with a parameter:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

**ignition/modules/Apollo.ts**

```typescript
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Apollo", (m) => {
  const apollo = m.contract("Rocket", [m.getParameter("name", "Saturn V")]);

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
  const apollo = m.contract("Rocket", [m.getParameter("name", "Saturn V")]);

  m.call(apollo, "launch", []);

  return { apollo };
});
```

:::

::::

The above module code will deploy `Rocket` with the name provided in the parameters.

Learn more about how to provide a deployment with parameters in the [Defining parameters during deployment](./deploy.md#defining-parameters-during-deployment) section.

## Creating a module hierarchy using submodules

You can organize your deployment into different Ignition Modules, which makes it easier to build the setup and reason about the deployment big picture.

When you are defining a module, you can access other modules as submodules and use their resulting `Future` objects. To do this you need to call `m.useModule` with a module object as returned by `buildModule` as an argument:

```js
const TokenModule = buildModule("TokenModule", (m) => {
  const token = m.contract("Token", ["My Token", "TKN2", 18]);

  return { token };
});

const TokenOwnerModule = buildModule("TokenOwnerModule", (m) => {
  const { token } = m.useModule(TokenModule);

  const owner = m.contract("TokenOwner", [token]);
  m.call(token, "transferOwnership", [owner]);

  return { owner };
});
```

If you use a `Future` called `A` that you retrieved from a submodule `Sub` to create another `Future` called `B`, then `B` will depend on `A`, but it will also have an implicit dependency on every `Future` within `Sub`. This means `B` will only be executed after `Sub` is fully executed.

Calling `m.useModule` multiple times with the same Ignition Module as a parameter doesn't lead to multiple deployments. Hardhat Ignition only executes `Future` objects once.

## Deploying and calling contracts from different accounts

If you need to change the sender of a deployment, call, or another `Future`, you can do it by providing the `from` field in an options object.

For example, to deploy a contract from a specific account:

```js
const token = m.contract("Token", ["My Token", "TKN2", 18], { from: "0x...." });
```

You can also define a module that uses the accounts that Hardhat has available during the deployment. To access the Hardhat accounts use `m.getAccount(index)`:

```js
const account1 = m.getAccount(1);
const token = m.contract("Token", ["My Token", "TKN2", 18], { from: account1 });
```

## Using existing artifacts

If you need to deploy or interact with a contract that isn't part of your Hardhat project, you can provide your own artifacts.

All the methods that create `Future` objects for contracts also accept artifacts in the second argument through overloads. Here are examples for each of them:

```js
const token = m.contract("Token", TokenArtifact, ["My Token", "TKN2", 18]);

const myLib = m.library("MyLib", MyLibArtifact);

const token2 = m.contractAt("Token", TokenArtifact, token2Address);
```

In this case, the name of the contract is only used to generate [`Future` IDs](#future-ids), and not to load any artifact.

## Linking libraries

To link a library when deploying a contract, you can use the `libraries` field in an options object when calling `m.contract` or `m.library`:

```js
const myLib = m.library("MyLib");
const myContract = m.contract("MyContract", [], {
  libraries: {
    MyLib: myLib,
  },
});
```
