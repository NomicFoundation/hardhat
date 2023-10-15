# Creating Ignition Modules

When using Hardhat Ignition, you define your deployments using Ignition Modules. An Ignition module is an abstraction you use to describe the system you want to deploy. Each Ignition Module groups a set of smart contract instances of your system.

This guide will explain you how to create Ignition Modules.

## The module definition API

To create an Ignition Module, you need to import the `buildModule` function from `@nomicfoundation/hardhat-ignition/modules` and call it passing a `string` that will be use as the module id, and a callback that defines the content of the module.

For example, this is a module which will have the string `"MyToken"` as id:

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

While you can create as many modules in a file as you want as long as their ids are unique, to deploy a module, you need to export it using `module.exports =` or `export default`. We recommend creating a single module per file, and using the module id as file name.

The second argument we passed to `buildModule` is a module definition callback, which receives a `ModuleBuilder` object. This object has mehtods you use to define the contents of the module. For example, we used the `contract` method to define an instance of the contract `Token`.

Calling a methods of `ModuleBuilder` won't deploy any contract nor interact with the network in any way. Instead, it will create a `Future`, register it within the module, and return it.

A `Future` is an object representing the result of an execution step that Hardhat Ignition needs to run to deploy a contract or interact with an existing one. To deploy a module, Hardhat Ignition executes every one of its future, running its execution step once, and storing its results.

Finally, `Future`s representing contract instances can be returned by the module defintion callback to expose one or more contracts to other modules and tests, just like we returned `token` in our example.

## The different kinds of `Future`

This section will explore the different kind of `Future` Hardhat Ignition supports, and how to defined them using a `ModuleBuilder`.

### Deploying a contract

As we saw in our example above, to deploy an instance of a contract, you need to create a `Future` using `m.contract`.

Hardhat Ignition is aware of the contracts in your Hardhat project, so you can refer to them by their name, like you would do in a test.

Let's look at the example again:

```js
const token = m.contract("Token", ["My Token", "TKN", 18]);
```

Here we call `m.contract` and pass the contract name as the first argument. Then, we pass an array with the arguments that the constructor should receive.

If you want to use the value that a `Future` represents as an argument, all you need to do is passing the `Future` itself. Hardhat Ignition will know how to resolve it during execution.

For example, we can use the address of `token` like this:

```js
const foo = m.contract("ReceivesAnAddress", [token]);
```

If you need to send ETH to the constructor, you can pass an object with options as third argument to `m.contract`, and use its `value` field:

```js
const bar = m.contract("ReceivesETH", [], {
  value: 1_000_000_000n, // 1gwei
});
```

### Using an existing contract

If you need to interact with existing contract you can create a `Future` to represent it like this:

```js
const existingToken = m.contractAt("Token", "0x...");
```

Just like with `m.contract`, the first value is the name of the contract, and the second value is its address.

You can also use another `Future` as its address, which can be useful when using a factory, or to create a contract `Future` with a different interface (e.g. deploying a proxy instantiating it as its implementation).

### Calling contract methods

If you need to call a method of an contract all you need to do is

```js
m.call(token, "transfer", [receiver, amount]);
```

Here the first argument is the contract we want to call, the second one the method name, and the third one is an array of arguments. The array of arguments can contain other `Future`s and Hardhat Ignition will know how to resolve them.

This method returns a `Future` which we aren't assigning to any variable. This isn't a problem, as Hardhat Ignition will execute every `Future` within a module.

Finally, if you need to send ETH while calling this method, you can pass an object with options as third argument to `m.contract`, and use its `value` field:

```js
m.call(myContract, "receivesEth" [], {
  value: 1_000_000_000n, // 1gwei
});
```

### Reading a value from a contract

If you need to call a `view` or `pure` method of a contract to retreive a value, you can do it with `m.staticCall`:

```js
const balance = m.staticCall(token, "balanceOf", [address]);
```

Just like with `m.call`, `m.staticCall`'s first three arguments are the contract, the method name, and its argumetns, and it returns a `Future` representing the value returned by the method.

If the method you are calling returns more than one value, it will return the first one by default. You can customize this by passing an index or name as the forth value.

To execute this `Future`, Hardhat Ignition won't send any transaction, and use `eth_call` instead. Like every `Future`, it only gets executed once, and its result is recorded.

#### Reading a value from an event emitted by a contract

If you need to read a value that was generated by a contract and exposed through Solidity events, you can use `m.readEventArgument`:

```tsx
const transfer = m.call(token, "transfer", [receiver, amount]);

const value = m.readEventArgument(transfer, "Transfer", "_value");
```

Here, you pass the `Future` whose execution will emit the event, the event name, and the event argument (index or name) you want to read.

You can also pass an object with options, which can contain:

- `emitter`: A `Future` representing the contract instance that emits the event. This defaults to the contract you are interacting with in the `Future` you pass as first argument.
- `eventIndex`: If the are multiple events with the same name emitted by the `emitter`, you can use this parameter to select one of them. It defaults to `0`.

### Sending ETH or data to an account

If you need to send ETH or data to an account, you can do it like this

```js
const send = m.send("SendingEth", address, 1_000_000n);
const send = m.send("SendingData", address, undefined, "0x16417104");
```

The first argumetn of `m.send` is the id of the `Future`. To learn more about them jump to [this section](#future-ids).

The second argument is the address of the account you want to send the ETH or data to.

The third and forth one are optional, and are the amount of ETH to send, and the data.

### Deploying a library

If you need to deploy a library, you can do it with

```js
const myLib = m.library("MyLib");
```

To learn how to link them, please read [this section](#linking-libraries)

## `Future` ids

Each `Future` inside your should have a unique id. Normally, Hardhat Ignition will automatically generate an id for you, based on some of the parameters you pass when creating the `Future`.

In some cases, this automatic process may lead to a clash with an existing `Future`. If that happens, Hardhat Ignition won't try to resolve the clash, and you'd have to define an id manually. Every method of `ModuleBuilder` accepts an options object as last argument, which has an `id` field that can be used like this:

```js
const token = m.contract("Token", ["My Token 2", "TKN2", 18], {
  id: "MyToken2",
});
```

They are used to continue the execution of a deployment if it failed or if you want to modify it.

The `Future` ids are used to organize your deployment results, artifacts, and to resume a deployment after it failed or you extended it. For this reason, you should avoid changing your ids after running a deployment.

## Dependencies between futures

If you pass a `Future` as an argument when constructing a new one, a dependency from thew new one to the existing one is created.

Dependencies are used by Hardhat Ignition to understand in which order it needs to execute the `Future`s.

You can also decleare dependencies between `Future`s explictly. To do this, you can use the options object that all the methods to construct `Future`s accept. For example:

```js
const a = m.contract("A");
const b = m.contract("B", [], {
  after: [a],
});
```

## Module parameters

When you define your Ignition Modules you may want to use parameters to tweak some values during deployment.

You can do this by calling `m.getParamter`, and using its return value to define your `Future`s.

For example, we make our token name parametric like this:

```js
const tokenName = m.getParamter("name");
const token = m.contract("Token", [tokenName, "TKN2", 18]);
```

Now, when we deploy the module, we can provide a custom name. To learn how to do this, please read the [Deploying a module guide](./deploy.md).

## Using submodules

You can organize your deployment into different Ignition Modules, which can make them easier to write, read and reason about.

When you are defining a module, you can access other modules as submodules and use their result `Future`s. To do it, you need to call `m.useModule` passing the module, as returned by `buildModule`:

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

If you use a `Future` from a submodule to create a new `Future`, the new one will have a dependency on every `Future` within the submodule. This means that any possible initialization within the submodule will be completed by the time your new `Future` gets executed.

Calling multiple times to `m.useModule` with the same Ignition Module doesn't lead to multiple deployments. Hardhat Ignition only executes `Future`s once.

## Deploying and calling contracts from different accounts

If you need to change the sender of a deployment, call, or another future, you can do it by providing a `from` option.

For example, to deploy a contract from a different account you can do

```js
const token = m.contract("Token", ["My Token", "TKN2", 18], { from: "0x...." });
```

You can also define a module that uses the accounts that Hardhat has available during the deployment. To do it, you can use `m.getAccount(index)`, like this:

```js
const account1 = m.getAccount(1);
const token = m.contract("Token", ["My Token", "TKN2", 18], { from: account1 });
```

## Using existing artifacts

If you need to deploy or interact with a contract that isn't part of your Hardhat project, you can provide your own artifacts.

All the methods that create `Future`s that represent contracts have overloads that accept artifacts. Here are examples of all of them:

```js
const token = m.contract("Token", TokenArtifact, ["My Token", "TKN2", 18]);

const myLib = m.library("MyLib", MyLibArtifact);

const token2 = m.contractAt("Token", token2Address, TokenArtifact);
```

In this case, the name of the contract is only used to generate [`Future` ids](#future-ids), and not to load any artifact.

## Linking libraries

If you need to link a library when deploying a contract, you can do it by passing them in the options object when calling `m.contract` or `m.library`.

For example, you can do

```js
const myLib = m.library("MyLib");
const myContract = m.contract("MyContract", [], {
  libraries: {
    MyLib: myLib,
  },
});
```
