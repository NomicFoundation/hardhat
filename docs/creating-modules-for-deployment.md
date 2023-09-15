# Creating Modules for Deployments

---

### Table of Contents

- Creating Modules for Deployments
- [Deploying a Contract](./creating-modules-for-deployment.md#deploying-a-contract)
  - [Constructor arguments](./creating-modules-for-deployment.md#constructor-arguments)
  - [Adding an endowment of _Eth_](./creating-modules-for-deployment.md#adding-an-endowment-of-eth)
  - [Dependencies between contracts](./creating-modules-for-deployment.md#dependencies-between-contracts)
  - [Retrieving an artifact](./creating-modules-for-deployment.md#retrieving-an-artifact)
  - [Deploying from an artifact](./creating-modules-for-deployment.md#deploying-from-an-artifact)
  - [Using an existing contract](./creating-modules-for-deployment.md#using-an-existing-contract)
  - [Linking libraries](./creating-modules-for-deployment.md#linking-libraries)
- [Calling contract methods](./creating-modules-for-deployment.md#calling-contract-methods)
  - [Transferring _Eth_ as part of a call](./creating-modules-for-deployment.md#transferring-eth-as-part-of-a-call)
  - [Transferring _Eth_ outside of a call](./creating-modules-for-deployment.md#transferring-eth-outside-of-a-call)
  - [Using the results of statically calling a contract method](./creating-modules-for-deployment.md#using-the-results-of-statically-calling-a-contract-method)
  - [Waiting for on-chain events](./creating-modules-for-deployment.md#waiting-for-on-chain-events)
- [Network Accounts Management](./creating-modules-for-deployment.md#network-accounts-management)
- [Including modules within modules](./creating-modules-for-deployment.md#including-modules-within-modules)
- [Module Parameters](./creating-modules-for-deployment.md#module-parameters)

---

An **Ignition** deployment is composed of modules. A module is a special javascript/typescript function that encapsulates several on-chain transactions (e.g. deploy a contract, invoke a contract function etc).

For example, this is a minimal module `MyModule` that deploys an instance of a `Token` contract and exposes it to any consumer of `MyModule`:

```javascript
const { buildModule } = require("@nomicfoundation/hardhat-ignition");

module.exports = buildModule("MyModule", (m) => {
  const token = m.contract("Token");

  return { token };
});
```

Modules can be deployed directly at the cli (with `npx hardhat deploy MyModule.js`), within Hardhat mocha tests (see [Ignition in Tests](./using-ignition-in-hardhat-tests.md)) or consumed by other Modules to allow for complex deployments.

During a deployment, **Ignition** uses the module to generate an execution plan of the transactions to run and the order in which to run them based on their dependencies. A module uses the injected `DeploymentBuilder` to specify the on-chain transactions that will _eventually_ be run, and how they interdepend on each other.

## Deploying a contract

Ignition is aware of the contracts within the `./contracts` **Hardhat** folder. Ignition can deploy any compilable local contract by name:

```tsx
const token = m.contract("Token");
```

`token` here is called a **contract future**. It represents the contract that will _eventually_ be deployed.

### Constructor arguments

In **Solidity** contracts may have constructor arguments that need satisfied on deployment. This can be done by passing an `args` array as the second parameter:

```tsx
const token = m.contract("Token", ["My Token", "TKN", 18]);
```

### Adding an endowment of _Eth_

The deployed contract can be given an endowment of _Eth_ by passing the value of the endowment under the options object:

```tsx
const token = m.contract("Token", [], {
  value: BigInt(ethers.utils.parseUnits("1").toString()),
});
```

### Dependencies between contracts

If a contract needs the address of another contract as a constructor argument, the contract future can be used:

```tsx
const a = m.contract("A");
const b = m.contract("B", [a]);
```

You can think of this as `b` being the equivalent of a promise of an address, although **_futures are not promises_**.

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

A user might need to execute a method in a contract that wasn't deployed by Ignition. An existing contract can be leveraged by passing an address and artifact:

```tsx
const uniswap = m.contractAt("UniswapRouter", "0x0...", artifact);

m.call(uniswap, "swap", [
  /*...*/
]);
```

### Linking libraries

A library can be deployed and linked to a contract by passing the libraries contract future as a named entry under the libraries option:

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

### Transferring _Eth_ as part of a call

Similar to `ethers`, a call can transfer `Eth` by passing a `value` under the options:

```tsx
m.call(exchange, "deposit", [], {
  value: BigInt(ethers.utils.parseUnits("1").toString()),
});
```

### Transferring _Eth_ outside of a call

It's also possible to transfer `Eth` to a given address via a regular Ethereum transaction:

```tsx
m.sendETH(exchange, {
  value: ethers.utils.parseUnits("1"),
});
```

### Using the results of statically calling a contract method

A contract might need the result of some other contract method as an input:

```tsx
const token = m.contract("Token");
const totalSupply = m.staticCall(token, "totalSupply");

const someContract = m.contract("ContractName", [totalSupply]);
```

In this example, `totalSupply` is called a **deferred value**. Similar to how a contract future is a contract that will eventually be deployed, a deferred value is some value that will eventually be available. That means **you can't do this**:

```tsx
if (totalSupply > 0) {
  ...
}
```

Because `totalSupply` is not a number, it is a future.

## Waiting for on-chain events

A deployment can be put `on-hold` until an on-chain event has been emitted (for instance a timelock or multisig approval):

```tsx
const multisig = m.contract("Multisig", []);

const call = m.call(multisig, "authorize");

const authorizerEventArg = m.readEventArgument(
  call,
  "AuthorizedBy", // Event name
  "Authorizer" // Event arg name
);

m.call(multisig, "execute", [authorizerEventArg]);
```

The `event` during deployment will check whether an event matching the given filter args has been emitted. If it has, the deployment will continue, if not the deployment will pause and listen for the event for a [configurable](./running-a-deployment.md#configuration-options) period of time. If the event has not been detected within this listening period, the deployment stops in the `on-hold` condition. A further run of the deployment will recheck the `event` condition.

Upon execution, the `EventFuture` will be resolved to the values of the requested parameter emitted by the given event. You can then use that value in tests or other modules as expected.

## Network Accounts Management

All accounts configured for the current network can be accessed from within an **Ignition** module via `m.getAccount(index)`:

```tsx
module.exports = buildModule("Multisig", (m) => {
  const owner = m.getAccount(0);
});
```

You can then use these addresses anywhere you normally would, such as constructor or function args. Additionally, you can pass them as a value to the `from` option in order to specify which account you would like a specific transaction sent from:

```tsx
module.exports = buildModule("Multisig", (m) => {
  const owner = m.getAccount(0);
  const alsoAnOwner = m.getAccount(1);
  const notAnOwner = m.getAccount(2);

  const multisig = m.contract("Multisig", [owner, alsoAnOwner], {
    from: owner,
  });

  const value = BigInt(ethers.utils.parseUnits("100").toString());
  const fund = m.send("fund", multisig, value, undefined, { from: notAnOwner });

  const call = m.call(multisig, "authorize", [], { from: alsoAnOwner });
});
```

Note that if `from` is not provided, **Ignition** will default to sending transactions using the first configured account (`accounts[0]`).

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

When a module is deployed, the proper parameters must be provided. If they are not available, the deployment won't be executed and will error.

You can use optional params by providing default values:

```tsx
const symbol = m.getParameter("tokenSymbol", "TKN");
```

---

Next, let's take a look at using an **Ignition** module within _Hardhat_ tests:

[Using Ignition in _Hardhat_ tests](./using-ignition-in-hardhat-tests.md)
