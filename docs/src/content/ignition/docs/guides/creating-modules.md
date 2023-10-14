# Creating Ignition Modules

- You define your deployment using modules
- What is a module
- buildModule
- Module id
- We recommend 1 module per file, with the name of the file matching the id
- `ModuleBuilder` and its methods
- They create futures
- Different kind of futures
  - Deploying a contract
  - Instantiating a contract
  - Call
  - Static call
  - Red event argument
  - Libraries
- Dependencies between futures and after
- Future ids
- Using parameters
- Passing ETH
- From and accounts
- Submodules
- Using existing artifacts
- Linking libraries

---

Previous content:

A Hardhat Ignition deployment is composed of modules. A module is a set of related smart contracts to be deployed, with accompanying contract calls, expressed through Hardhat Ignition's declarative Module API.

For example, this is a minimal module `MyModule` that deploys an instance of a `Token` contract and exports it to consumers of `MyModule`:

```javascript
const { buildModule } = require("@nomicfoundation/hardhat-ignition");

module.exports = buildModule("MyModule", (m) => {
  const token = m.contract("Token");

  return { token };
});
```

Modules can be deployed: directly at the command-line with the `deploy` task, within Hardhat tests (see [Using Hardhat Ignition in tests](./tests.md)) or consumed by other modules to allow for more complex deployments.

## Deploying a contract

Hardhat Ignition is aware of the contracts within the `./contracts` Hardhat folder. Hardhat Ignition can deploy any compilable local contract by name:

```tsx
const token = m.contract("Token");
```

`token` here is called a contract future. It represents the contract that will _eventually_ be deployed.

### Constructor arguments

In Solidity contracts may have constructor arguments that need satisfied on deployment. This can be done by passing an `args` array as the second parameter:

```tsx
const token = m.contract("Token", ["My Token", "TKN", 18]);
```

### Adding an endowment of _ETH_

The deployed contract can be given an endowment of _ETH_ by passing the value of the endowment in _wei_ as a `BigInt`, under the options object:

```tsx
const token = m.contract("Token", [], {
  value: BigInt(1_000_000_000),
});
```

### Dependencies between contracts

If a contract needs the address of another contract as a constructor argument, the contract future can be used:

```tsx
const a = m.contract("A");
const b = m.contract("B", [a]);
```

You can think of this as `b` being the equivalent of a promise of an address, although _futures are not promises_.

If a contract does not directly depend through arguments on another contract, a dependency (don't deploy `b` until `a` is successfully deployed) can still be created using the `after` array of options:

```tsx
const a = m.contract("A");
const b = m.contract("B", [], {
  after: [a],
});
```

### Deploying from an artifact

To allow you to use your own mechanism for getting the contract artifact, `contract` supports passing an `Artifact` as the second parameter:

```javascript
const artifact = hre.artifacts.readArtifactSync("Foo");

const userModule = buildModule("MyModule", (m) => {
  m.contract("Foo", artifact, [0]);
});
```

### Using an existing contract

A user might need to execute a method in a contract that wasn't deployed by Hardhat Ignition. An existing contract can be leveraged by passing an address and artifact:

```tsx
const uniswap = m.contractAt("UniswapRouter", "0x0...", artifact);

m.call(uniswap, "addLiquidity", [
  /*...*/
]);
```

### Linking libraries

A library can be deployed and linked to a contract by passing the library's future as a named entry under the libraries option:

```tsx
const safeMath = m.library("SafeMath");
const contract = m.contract("Contract", [], {
  libraries: {
    SafeMath: safeMath,
  },
});
```

A library is deployed in the same way as a contract.

## Calling contract methods

Not all contract configuration happens via the constructor. To configure a contract through a call to a contract method:

```tsx
const token = m.contract("Token");
const exchange = m.contract("Exchange");

m.call(exchange, "addToken", [token]);
```

### Transferring _ETH_ as part of a call

Similar to `ethers`, a call can transfer _ETH_ by passing a value in _wei_ as a `BigInt` under the options:

```tsx
m.call(exchange, "deposit", [], {
  value: BigInt(1_000_000_000),
});
```

### Transferring _Eth_ outside of a call

It's also possible to transfer `ETH` to a given address via a regular Ethereum transaction:

```tsx
m.sendETH(exchange, {
  value: BigInt(1_000_000_000),
});
```

### Using the results of statically calling a contract method

A contract might need the result of some other contract method as an input:

```tsx
const token = m.contract("Token");
const totalSupply = m.staticCall(token, "totalSupply");

const someContract = m.contract("ContractName", [totalSupply]);
```

In this example, `totalSupply` is called a deferred value. Similar to how a contract future is a contract that will eventually be deployed, a deferred value is some value that will eventually be available. That means you can't do this:

```tsx
if (totalSupply > 0) {
  ...
}
```

Because `totalSupply` is not a number, it is a future.

## Retrieving data from events

Important data and values generated by contract calls are often exposed through Solidity events. Hardhat Ignition allows you to retrieve event arguments and use them in subsequent contract calls:

```tsx
const multisig = m.contract("Multisig", []);

const call = m.call(multisig, "authorize");

const authorizer = m.readEventArgument(
  call,
  "AuthorizedBy", // Event name
  "Authorizer" // Event argument name
);

m.call(multisig, "execute", [authorizer]);
```

## Network Accounts Management

All accounts configured for the current network can be accessed from within an Hardhat Ignition module via `m.getAccount(index)`:

```tsx
module.exports = buildModule("Multisig", (m) => {
  const owner = m.getAccount(0);
  // ...
});
```

You can then use these addresses in constructor or function args. Additionally, you can pass them as a value to the `from` option in order to specify which account you would like a specific transaction sent from:

```tsx
module.exports = buildModule("Multisig", (m) => {
  const owner = m.getAccount(0);
  const alsoAnOwner = m.getAccount(1);
  const notAnOwner = m.getAccount(2);

  const multisig = m.contract("Multisig", [owner, alsoAnOwner], {
    from: owner,
  });

  const value = BigInt(1_000_000_000);
  const fund = m.send("fund", multisig, value, undefined, { from: notAnOwner });

  const call = m.call(multisig, "authorize", [], { from: alsoAnOwner });
});
```

Note that if `from` is not provided, Hardhat Ignition will default to sending transactions using the first configured account (`accounts[0]`).

## Including modules within modules

Modules can be deployed and consumed within other modules via `m.useModule(...)`:

```tsx
module.exports = buildModule("`TEST` registrar", (m) => {
  // ...

  const { ens, resolver, reverseRegistrar } = m.useModule(setupENSRegistry);

  // Setup registrar
  const registrar = m.contract("FIFSRegistrar", [ens, tldHash]);

  // ...

  return { ens, resolver, registrar, reverseRegistrar };
});
```

Calls to `useModule` memoize the results object.

Only contract or library types can be returned when building a module.

## Module parameters

Modules can have parameters that are accessed using the `DeploymentBuilder` object:

```tsx
const symbol = m.getParameter("tokenSymbol");
const name = m.getParameter("tokenName");

const token = m.contract("Token", {
  args: [symbol, name, 1_000_000],
});
```

When a module is deployed, the proper parameters must be provided, indexed by the `ModuleId`. If they are not available, the deployment won't be executed and will error.

You can use optional params by providing default values:

```tsx
const symbol = m.getParameter("tokenSymbol", "TKN");
```

Previous parameters content:

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
