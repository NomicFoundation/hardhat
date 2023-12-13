# Using Hardhat Ignition in your tests

If you want to test that your deployment was correctly defined, or if you want to use your Ignition Modules to simplify your test setup, continue reading this guide.

## The Ignition object

Requiring Hardhat Ignition within your Hardhat config will automatically add an `ignition` object to the [Hardhat Runtime Environment](../../../hardhat-runner/docs/advanced/hardhat-runtime-environment.md).

The `ignition` object exposes a `deploy` method, that takes an Ignition Module as the first argument.

```js
// We define a module in the test file here, but you can also `require`/`import` it.
const CounterModule = buildModule("Counter", (m) => {
  const startCount = m.getParameter("startCount", 0);

  const counter = m.contract("Counter", [startCount]);

  return { counter };
});

it("should set the start count to 0 by default", async function () {
  const { counter } = await ignition.deploy(CounterModule);

  assert.equal(await counter.count(), 42);
});
```

The `ignition.deploy` method returns an object with an `ethers` contract per contract `Future` returned in your module.

## Using module parameters

The `ignition.deploy` receives an options object as second argument which can be used to provide [Module parameters](./creating-modules.md#module-parameters) under the `parameters` field of the object. You should provide an object mapping module ID to parameters, like this:

```js
it("should allow setting the start count for new counters", async function () {
  const { counter } = await ignition.deploy(CounterModule, {
    parameters: {
      Counter: {
        startCount: 42,
      },
    },
  });

  assert.equal(await counter.count(), 42);
});
```

## Using Ignition Modules as fixtures

You can combine Hardhat Ignition with [Hardhat Network Helper's `loadFixture`](../../../hardhat-network-helpers/docs/reference.md#loadfixture) to use them to easily define your fixtures by calling `ignition.deploy` within them.

```js
async function deployCounterModuleFixture() {
  return ignition.deploy(CounterModule);
}

it("should set the start count to 0 by default", async function () {
  const counter = await loadFixture(deployCounterModuleFixture);

  return { counter };
});
```

## Sending transactions with a different account

The `ignition.deploy` method will default to using the first account in Hardhat network's `accounts` array as the sender for all transactions.

You can change this by passing a `defaultSender` within the options object as a second argument to the `deploy` method:

```typescript
const [first, second] = await hre.ethers.getSigners();

const result = await hre.ignition.deploy(CounterModule, {
  defaultSender: second.address,
});
```
