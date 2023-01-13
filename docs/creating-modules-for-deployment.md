# Creating Modules for Deployments

---

### Table of Contents

- Creating Modules for Deployments
- [Deploying a Contract](./creating-modules-for-deployment.md#deploying-a-contract)
  - [Constructor arguments](./creating-modules-for-deployment.md#constructor-arguments)
  - [Adding an endowment of _Eth_](./creating-modules-for-deployment.md#adding-an-endowment-of-eth)
  - [Dependencies between contracts](./creating-modules-for-deployment.md#dependencies-between-contracts)
  - [Using an existing contract](./creating-modules-for-deployment.md#using-an-existing-contract)
  - [Deploying from an artifact](./creating-modules-for-deployment.md#deploying-from-an-artifact)
  - [Linking libraries](./creating-modules-for-deployment.md#linking-libraries)
  - [Create2](./creating-modules-for-deployment.md#create2)
- [Calling contract methods](./creating-modules-for-deployment.md#calling-contract-methods)
  - [Transfering _Eth_ as part of a call](./creating-modules-for-deployment.md#transfering-eth-as-part-of-a-call)
  - [Transfering _Eth_ outside of a call](./creating-modules-for-deployment.md#transfering-eth-outside-of-a-call)
  - [Using the results of a call with a deferred value (TBD)](./creating-modules-for-deployment.md#using-the-results-of-a-call-with-a-deferred-value-tbd)
  - [Waiting for on-chain events](./creating-modules-for-deployment.md#waiting-for-on-chain-events)
- [Including modules within modules](./creating-modules-for-deployment.md#including-modules-within-modules)
- [Module Parameters](./creating-modules-for-deployment.md#module-parameters)
- [Switching based on the _Network Chain ID_](./creating-modules-for-deployment.md#switching-based-on-the-network-chain-id)

---

An **Ignition** deployment is composed of modules. A module is a special javascript/typescript function that encapsulates several on-chain transactions (e.g. deploy a contract, invoke a contract function etc).

For example, this is a minimal module `MyModule` that deploys an instance of a `Token` contract and exposes it to any consumer of `MyModule`:

```javascript
const { buildModule } = require("@ignored/hardhat-ignition");

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

In **Solidity** contracts may have constructor arguments that need satisfied on deployment. This can be done by passing an `args` array as part of the options:

```tsx
const token = m.contract("Token", {
  args: ["My Token", "TKN", 18],
});
```

### Adding an endowment of _Eth_

The deployed contract can be given an endowment of _Eth_ by passing the value of the endowment under the options object:

```tsx
const token = m.contract("Token", {
  value: ethers.utils.parseUnits("1"),
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

You can think of this as `b` being the equivalent of a promise of an address, although **_futures are not promises_**.

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

### Create2

`Create2` allows for reliably determining the address of a contract before it is deployed.

It requires a factory contract:

```solidity
//SPDX-License-Identifier: MIT
pragma solidity ^0.8.5;

import "@openzeppelin/contracts/utils/Create2.sol";

contract Create2Factory {
    event Deployed(bytes32 indexed salt, address deployed);

    function deploy(
        uint256 amount,
        bytes32 salt,
        bytes memory bytecode
    ) public returns (address) {
        address deployedAddress;

        deployedAddress = Create2.deploy(amount, salt, bytecode);
        emit Deployed(salt, deployedAddress);

        return deployedAddress;
    }
}
```

Given the `create2` factory, you can deploy a contract via the factory by:

```ts
module.exports = buildModule("Create2Example", (m) => {
  const create2 = m.contract("Create2Factory");

  const fooAddress = m.call(create2, "deploy", {
    args: [
      0, // amount
      toBytes32(1), // salt
      m.getBytesForArtifact("Foo"), // contract bytecode
    ],
  });

  return { create2, foo: m.contractAt(fooAddress) };
});
```

## Calling contract methods

Not all contract configuration happens via the constructor. To configure a contract through a call to a contract method:

```tsx
const token = m.contract("Token");
const exchange = m.contract("Exchange");

m.call(exchange, "addToken", {
  args: [token],
});
```

### Transfering _Eth_ as part of a call

Similar to `ethers`, a call can transfer `Eth` by passing a `value` under the options:

```tsx
m.call(exchange, "deposit", {
  value: ethers.utils.parseUnits("1"),
});
```

### Transferring _Eth_ outside of a call

It's also possible to transfer `Eth` to a given address via a regular Ethereum transaction:

```tsx
m.sendETH(exchange, {
  value: ethers.utils.parseUnits("1"),
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

## Waiting for on-chain events

A deployment can be put `on-hold` until an on-chain event has been emitted (for instance a timelock or multisig approval):

```tsx
const multisig = m.deploy("Multisig");

const call = m.call(multisig, "authorize");

const event = m.awaitEvent(multisig, "AuthorizedBy", {
  args: ["0xUser1"],
  after: [call],
});

m.call(multisig, "execute", { args: [event.params.transactionId] });
```

The `awaitEvent` during deployment will check whether an event matching the given filter args has been emitted. If it has, the deployment will continue, if not the deployment will pause and listen for the event for a [configurable](./running-a-deployment.md#configuration-options) period of time. If the event has not been detected within this listening period, the deployment stops in the `on-hold` condition. A further run of the deployment will recheck the `awaitEvent` condition.

Upon execution, the `EventFuture` will be resolved to the values of the params emitted by the given event. You can then use those values in tests or other modules as expected.

A full example of the `awaitEvent` function can be seen in our [Multisig example](../examples/multisig/README.md).

## Including modules within modules

Modules can be deployed and consumed within other modules via `m.useModule(...)`:

```tsx
module.exports = buildModule("`TEST` registrar", (m) => {
  // ...

  const { ens, resolver, reverseRegistrar } = m.useModule(setupENSRegistry);

  const registrar = m.contract("FIFSRegistrar", {
    args: [ens, namehash.hash("test")],
  });

  // ...

  return { ens, resolver, registrar, reverseRegistrar };
});
```

Calls to `useModule` memoize the results object, assuming the same parameters are passed. Multiple calls to the same module with different parameters are banned.

Only `CallableFuture` types can be returned when building a module, so contracts or libraries (not calls).

## Module parameters

Modules can have parameters that are accessed using the `DeploymentBuilder` object:

```tsx
const symbol = m.getParam("tokenSymbol");
const name = m.getParam("tokenName");

const token = m.contract("Token", {
  args: [symbol, name, 1_000_000],
});
```

When a module is deployed, the proper parameters must be provided. If they are not available, the deployment won't be executed and will error.

You can use optional params with default values too:

```tsx
const symbol = m.getOptionalParam("tokenSymbol", "TKN");
```

## Switching based on the _Network Chain ID_

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

---

Next, let's take a look at using an **Ignition** module within _Hardhat_ tests:

[Using Ignition in _Hardhat_ tests](./using-ignition-in-hardhat-tests.md)
