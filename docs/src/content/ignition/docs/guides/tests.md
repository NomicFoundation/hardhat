# Using Hardhat Ignition in your tests

Hardhat Ignition can be used in Hardhat tests to deploy your Ignition Modules.

If you want to test that your deployment was correctly defined, your you want to use Ignition Modules to simplify your test setup, continue reading this guide.

## The Ignition object

Requiring Hardhat Ignition within your Hardhat config will automatically add an `ignition` object to the [Hardhat Runtime Environment](../../../hardhat-runner/docs/advanced/hardhat-runtime-environment.md).

The `ignition` object exposes a `deploy` method, that takes a Module as the first argument.

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

The `ignition.deploy` also receives an options object as second argument. You can use it to pass [Module parameters](./parameters.md) under the `parameters` property of the options object. You can do it by passing a map from module ids to parameters, like this:

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

You can combine Hardhat Ignition with [Hardhat Network Helper's `loadFixture`](../../../hardhat-network-helpers/docs/reference.md#loadfixture) to use them to easily define your fixtures, you just need to call `ignition.deploy` within your fixture.

```js
async function deployCounterModuleFixture() {
  return ignition.deploy(CounterModule);
}

it("should set the start count to 0 by default", async function () {
  const counter = await loadFixture(deployCounterModuleFixture);

  return { counter };
});
```
