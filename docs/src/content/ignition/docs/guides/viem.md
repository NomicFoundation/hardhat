# Using Viem

Hardhat Ignition provides a variant based on using [Viem](https://viem.sh) as your connection library. Viem is a lightweight alternative to [ethers](https://docs.ethers.org) with a focus on type safety.

The Viem support in Hardhat Ignition includes a helper function, for use in Hardhat tests and scripts, that allows you to deploy Ignition modules and get back the deployed contracts as fully typed Viem contract instances.

## Installation

To install Hardhat Ignition with Viem support in an existing Hardhat project, you will need:

- Hardhat version 2.18.0 or higher
- Viem version 1.18.0 or higher

You can also follow [Hardhat's Viem Quick Start](../../../hardhat-runner/docs/advanced/using-viem#quick-start) to create a new Hardhat Viem project from scratch.

From the root directory of your Hardhat project run:

::::tabsgroup{options="npm 7+,npm 6,yarn,pnpm"}

:::tab{value="npm 7+"}

```shell
npm install --save-dev @nomicfoundation/hardhat-ignition-viem
```

:::

:::tab{value="npm 6"}

```shell
npm install --save-dev @nomicfoundation/hardhat-ignition-viem @nomicfoundation/hardhat-ignition @nomicfoundation/hardhat-verify @nomicfoundation/hardhat-viem @nomicfoundation/ignition-core typescript viem
```

:::

:::tab{value=yarn}

```shell
yarn add --dev @nomicfoundation/hardhat-ignition-viem @nomicfoundation/hardhat-ignition @nomicfoundation/hardhat-verify @nomicfoundation/hardhat-viem @nomicfoundation/ignition-core typescript viem
```

:::

:::tab{value="pnpm"}

```shell
pnpm add -D @nomicfoundation/hardhat-ignition-viem viem typescript
```

:::

::::

Then [enable the plugin](../../../hardhat-runner/docs/guides/project-setup.md#plugins-and-dependencies) in your config file:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```typescript
import "@nomicfoundation/hardhat-ignition-viem";
```

:::

:::tab{value="JavaScript"}

```javascript
require("@nomicfoundation/hardhat-ignition-viem");
```

:::

::::

:::tip

Only **one** Hardhat Ignition package should be imported within your Hardhat config file. Viem and ethers support cannot both be enabled at the same time.

:::

## The Ignition object

The `@nomicfoundation/hardhat-plugin-viem` plugin adds an `ignition` object to the [Hardhat Runtime Environment](../../../hardhat-runner/docs/advanced/hardhat-runtime-environment.md).

The `ignition` object exposes a `deploy` method, which takes an Ignition module, deploys it against the current network, like Hardhat Network, and returns the results of the module as typed Viem contract instances.

The `deploy` method takes the Module as its first argument:

```typescript
const ApolloModule = buildModule("Apollo", (m) => {
  const apollo = m.contract("Rocket", ["Saturn V"]);

  return { apollo };
});

it("should have named the rocket Saturn V", async function () {
  const { apollo } = await hre.ignition.deploy(ApolloModule);

  assert.equal(await apollo.read.name(), "Saturn V");
});
```

The `ignition.deploy` method returns an object with a Viem contract instance per `Future` returned as a result in the module.

## Usage with Artifacts

To infer the type of a Viem contract instance, the full type of the ABI must be available when initializing a `Future` within a module.

For named Hardhat contracts, the ABI and type information will be retrieved automatically using [hardhat-viem's type generation](https://hardhat.org/hardhat-runner/docs/advanced/using-viem#contract-type-generation).

If you are passing an artifact object to initialize a `Future` within a module, you will need to ensure the artifact's ABI is either declared with [const assertions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions) or defined inline:

```typescript
const counterArtifact = {
  // ...
  abi: [...] as const, // <--- const assertion
}

const CounterModule = buildModule("Counter", (m) => {
  const counter = m.contract("Counter", CounterArtifact, [42]);

  return { counter };
});
```

If type inference isn't working for the returned contract, it is likely that the ABI type needs a `const` assertion or to be defined inline.

This is because the ABI type must be as narrow as possible for Viem to infer the correct type for the contract, and by default Typescript will broaden the types within object literals.

:::tip

Typescript doesn't support importing JSON as const, it will instead automatically broaden the type, breaking Viem's inference. The artifact must be defined inline within Typescript.

:::

See [Viem's type inference requirements](https://viem.sh/docs/typescript.html#type-inference) for more details.

## Sending transactions with a different account

The `ignition.deploy` method will default to using the first account in Hardhat network's `accounts` array as the sender for all transactions.

You can change this by passing a `defaultSender` within the options object as a second argument to the `deploy` method:

```typescript
const [first, second] = await hre.viem.getWalletClients();

const result = await hre.ignition.deploy(ApolloModule, {
  defaultSender: second.account.address,
});
```

## Hardhat Ignition and Hardhat Viem

Hardhat Ignition leverages the [hardhat-viem](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-viem) plugin for its type generation support, and inherits the same approach to [managing types and version stability](https://hardhat.org/hardhat-runner/docs/advanced/using-viem#managing-types-and-version-stability).

Read the documentation on [hardhat-viem](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-viem) to learn more about Hardhat's Viem capabilities.
