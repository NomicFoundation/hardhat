# Creating Modules for Deployments

An **Ingition** deployment is composed of modules. A module is a special javascript/typescript function that encapsulates several on-chain transactions (e.g. deploy a contract, invoke a contract function etc).

For example, this is a minimal module `MyModule` that deploys an instance of a `Token` contract and exposes it to any consumer of `MyModule`:

```javascript
// ./ignition/MyModule.ts
import { buildModule, ModuleBuilder } from "@nomicfoundation/hardhat-ignition"

export default buildModule("MyModule", (m: ModuleBuilder) => {
  const token = m.contract("Token")

  return { token }
})
```

Modules can be deployed directly at the cli (with `npx hardhat deploy ./ignition/MyModule.ts`), within Hardhat mocha tests (see [Ignition in Tests](TBD)) or consumed by other Modules to allow for complex deployments.

During a deployment **Ignition** uses the module to generate an execution plan of the transactions to run and the order and dependency in which to run them. A module uses the passed `ModuleBuilder` to specify the on-chain transactions that will _eventually_ be run, and how they relate to each other to allow building a dependency graph.

## Deploying a contract

Ignition is aware of the contracts within the `./contracts` **Hardhat** folder. Ignition can deploy any compilable local contract by name:

```tsx
const token = m.contract("Token")
```

`token` here is called a **contract binding**. It represents the contract that will *eventually* be deployed.

### Constructor arguments

In **Solidity** contracts may have constructor arguments that need satisfied on deployment. This can be done by passing an `args` array as part of the options:

```tsx
const token = m.contract("Token", {
  args: ["My Token", "TKN", 18]
})
```

### Dependencies between contracts

If a contract needs the address of another contract as a constructor argument, the contract binding can be used:

```tsx
const a = m.contract("A")
const b = m.contract("B", {
  args: [a]
})
```

You can think of this as `b` being analogue to a promise of an address, although bindings are not promises.
