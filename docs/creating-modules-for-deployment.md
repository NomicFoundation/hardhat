# Creating Modules for Deployments

---

### Table of Contents

- [Getting Started](./getting-started-guide.md)
  - [Setup](./getting-started-guide.md#setup)
  - [Writing Your First Deployment Module](./getting-started-guide.md#writing-your-first-deployment-module)
- Creating Modules for Deployment
  - [Deploying a Contract](./creating-modules-for-deployment.md#deploying-a-contract)
  - [Executing a Method on a Contract](./creating-modules-for-deployment.md#executing-a-method-on-a-contract)
  - [Using the Network Chain ID](./creating-modules-for-deployment.md#using-the-network-chain-id)
  - [Module Parameters](./creating-modules-for-deployment.md#module-parameters)
  - [Modules Within Modules](./creating-modules-for-deployment.md#modules-within-modules)
- [Visualizing Your Deployment](./visualizing-your-deployment.md)
  - [Actions](./visualizing-your-deployment.md#actions)
- [Testing With Hardhat](./testing-with-hardhat.md)

---

An **Ignition** deployment is composed of modules. A module is a special javascript/typescript function that encapsulates several on-chain transactions (e.g. deploy a contract, invoke a contract function etc).

For example, this is a minimal module `MyModule` that deploys an instance of a `Token` contract and exposes it to any consumer of `MyModule`:

```javascript
// ./ignition/MyModule.js
const { buildModule } = require("@ignored/hardhat-ignition");

module.exports = buildModule("MyModule", (m) => {
  const token = m.contract("Token");

  return { token };
});
```

Modules can be deployed directly at the cli (with `npx hardhat deploy MyModule.js`), within Hardhat mocha tests (see [Ignition in Tests](TBD)) or consumed by other Modules to allow for complex deployments.

During a deployment **Ignition** uses the module to generate an execution plan of the transactions to run and the order and dependency in which to run them. A module uses the passed `DeploymentBuilder` to specify the on-chain transactions that will _eventually_ be run, and how they relate to each other to allow building a dependency graph.

## Deploying a contract

Ignition is aware of the contracts within the `./contracts` **Hardhat** folder. Ignition can deploy any compilable local contract by name:

```tsx
const token = m.contract("Token");
```

`token` here is called a **contract future**. It represents the contract that will _eventually_ be deployed.

### Constructor arguments

In **Solidity** contracts may have constructor arguments that need satisfied on deployment. This can be done by passing an `args` array as part of the options:

```tsx
const token = m.contract("Token", {
  args: ["My Token", "TKN", 18],
});
```

### Dependencies between contracts

If a contract needs the address of another contract as a constructor argument, the contract future can be used:

```tsx
const a = m.contract("A");
const b = m.contract("B", {
  args: [a],
});
```

You can think of this as `b` being the equivalent of a promise of an address, although futures are not promises.

If a contract does not directly depend through arguments on another contract, a dependency (don't deploy `b` until `a` is successfully deployed) can still be created using the `after` array of options:

```tsx
const a = m.contract("A");
const b = m.contract("B", {
  after: [a],
});
```

### Using an existing contract

A user might need to execute a method in a contract that wasn't deployed by Ignition. An existing contract can be leveraged by passing an address and abi:

```tsx
const abi = [{...}]
const uniswap = m.contractAt("UniswapRouter", "0x123...", abi)

m.call(uniswap, "swap", { ... })
```

### Deploying from an artifact

To allow you to use your own mechanism for getting the contract artifact, `contract` supports passing an `Artifact` as an optional second parameter:

```javascript
const artifact = await this.hre.artifacts.readArtifact("Foo");

const userModule = buildModule("MyModule", (m) => {
  m.contract("Foo", artifact, {
    args: [0],
  });
});
```

### Linking libraries

A library can be deployed and linked to a contract by passing the libraries contract future as a named entry under the libraries option:

```tsx
const safeMath = m.library("SafeMath");
const contract = m.contract("Contract", {
  libraries: {
    SafeMath: safeMath,
  },
});
```

A library is deployed in the same way as a contract.

## Executing a Method on a Contract

Not all contract configuration happens via the constructor. To configure a contract calls can be made:

```tsx
const token = m.contract("Token");
const exchange = m.contract("Exchange");

m.call(exchange, "addToken", {
  args: [token],
});
```

### Using the results of a call with a deferred value (TBD)

A contract might need the result of some other contract method as an input:

```tsx
const token = m.contract("Token");
const totalSupply = m.call(token, "totalSupply");

const someContract = m.contract("ContractName", {
  args: [totalSupply],
});
```

In this example, `totalSupply` is called a **deferred value**. Similar to how a contract future is a contract that will eventually be deployed, a deferred value is some value that will eventually be available. That means **you can't do this**:

```tsx
if (totalSupply > 0) {
  ...
}
```

Because `totalSupply` is not a number, it is a future.

## Waiting for on-chain events (TBD)

A deployment can be put `on-hold` until an on-chain action, external to the deployment, has taken place (for instance a timelock or multisig approval). The `await` condition can be specified:

```tsx
let multisig = m.deploy("Multisig");

m.call(multisig, "authorize");

m.await({
  from: "0xUser1",
  to: multisig.address,
  // value: 20.toWei(),
  // function: 'authorize',
  events: [{ name: "AuthorizedBy", data: "0xUser1" }],
});
```

The `await` during deployment will check whether a transaction matching the parameters has occured. If it has the deployment will continue, if not the deployment stops in the `on-hold` condition. A further run of the deployment will recheck the `await` condition.

## Using the Network Chain ID

The `DeploymentBuilder` (`m`) exposes the chain id of the network in which the contracts are being deployed. This is useful if you need to do different things depending on the network.

```tsx
const userModule = buildModule("MyModule", (m) => {
  const daiAddresses = {
    1: "0x123...", // mainnet DAI
    4: "0x234...", // rinkeby DAI
  };

  const daiAddress = daiAddresses[m.chainId];
  const myContract = m.contract("MyContract", {
    args: [daiAddress],
  });
});
```

## Module Parameters

Modules can have parameters that are accessed using the `DeploymentBuilder` object:

```tsx
const symbol = m.getParam("tokenSymbol");
const name = m.getParam("tokenName");

const token = m.contract("Token", {
  args: [symbol, name, 1_000_000],
});
```

When a module is deployed, the proper parameters must be provided. If they are not available, the deployment won't be executed. You can use optional params with default values too:

```tsx
const symbol = m.getOptionalParam("tokenSymbol", "TKN");
```

## Modules Within Modules

Modules can be deployed and consumed within other modules via `m.useModule(...)`:

```tsx
module.exports = buildModule("`TEST` registrar", (m) => {
  const tld = "test";
  const tldHash = namehash.hash(tld);
  const tldLabel = labelhash(tld);

  const { ens, resolver, reverseRegistrar } = m.useModule(setupENSRegistry);

  // Setup registrar
  const registrar = m.contract("FIFSRegistrar", {
    args: [ens, tldHash],
  });

  m.call(ens, "setSubnodeOwner", {
    id: "set sub-node owner for registrar",
    args: [ZERO_HASH, tldLabel, ACCOUNT_0],
  });

  return { ens, resolver, registrar, reverseRegistrar };
});
```

Calls to `useModule` memoize the results object, assuming the same parameters are passed. Multiple calls to the same module with different parameters are banned.

Only `CallableFuture` types can be returned when building a module, so contracts or libraries (not calls).

## Global Configuration

There are currently two configurable options you can add to your `hardhat.config.js` file in order to adjust the way **Ignition** functions:

```typescript
interface IgnitionConfig {
  maxRetries: number;
  gasIncrementPerRetry: BigNumber | null;
}

// example inside hardhat.config.js
const { ethers } = require('ethers');

module.exports = {
  ignition: {
    maxRetries: 10,
    gasIncrementPerRetry: ethers.utils.parseUnits('0.001');
  }
}
```

These config values control how **Ignition** retries unconfirmed transactions that are taking too long to confirm.

The value of `maxRetries` is the number of times an unconfirmed transaction will be retried before considering it failed. (default value is 4)

The value of `gasIncrementPerRetry` must be an `ethers.BigNumber` and is assumed to be in wei units. This value will be added to the previous transactions gas price on each subsequent retry. However, if not given or if given value is `null`, then the default logic will run which adds 10% of the previous transactions gas price on each retry.

Next, let's take a look at another way to visualize your deployments:

[Visualizing your deployment](./visualizing-your-deployment.md)
