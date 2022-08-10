# Creating Modules for Deployments

An **Ingition** deployment is composed of modules. A module is a special javascript/typescript function that encapsulates several on-chain transactions (e.g. deploy a contract, invoke a contract function etc).

For example, this is a minimal module `MyModule` that deploys an instance of a `Token` contract and exposes it to any consumer of `MyModule`:

```javascript
// ./ignition/MyModule.ts
import { buildModule, ModuleBuilder } from "@nomicfoundation/hardhat-ignition";

export default buildModule("MyModule", (m: ModuleBuilder) => {
  const token = m.contract("Token");

  return { token };
});
```

Modules can be deployed directly at the cli (with `npx hardhat deploy ./ignition/MyModule.ts`), within Hardhat mocha tests (see [Ignition in Tests](TBD)) or consumed by other Modules to allow for complex deployments.

During a deployment **Ignition** uses the module to generate an execution plan of the transactions to run and the order and dependency in which to run them. A module uses the passed `ModuleBuilder` to specify the on-chain transactions that will _eventually_ be run, and how they relate to each other to allow building a dependency graph.

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

You can think of this as `b` being analogue to a promise of an address, although futures are not promises.

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
const safeMath = m.contract("SafeMath");
const contract = m.contract("Contract", {
  libraries: {
    SafeMath: safeMath,
  },
});
```

A library is deployed in the same way as a contract.

### Using the network chain id

The module builder (`m`) exposes the chain id of the network in which the contracts are being deployed. This is useful if you need to do different things depending on the network.

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
