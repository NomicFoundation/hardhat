# Getting Started

## Setup

Add **Ignition** to your **Hardhat** project by installing the plugin:

```shell
npm install @nomicfoundation/hardhat-ignition
```

Modify your `Hardhat.config.{ts,js}` file, to include **Ignition**:

```javascript
import { HardhatUserConfig, task } from "hardhat/config";
// ...
import "@nomicfoundation/hardhat-ignition";
```

Create an `./ignition` folder in your project root to contain your deployment modules.

```shell
mkdir ./ignition
```

## Write a deployment Module

Add a deployment module under the `./ignition` folder:

```typescript
// ./ignition/MyModule.ts

import { buildModule, ModuleBuilder } from "@nomiclabs/hardhat-ignition"

export default buildModule("MyModule", (m: ModuleBuilder) => {
  const token = m.contract("Token")

  return { token }
})
```

Run the `deploy` task to test the module against a local ephemeral **Hardhat** node:

```shell
npx hardhat deploy ./ignition/MyModule.ts
# No need to generate any newer typings.
# Token contract address 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

To deploy against a network configured in `hardhat.config.{ts,js}` pass the network name:

```shell
npx hardhat deploy --network mainnet ./ignition/MyModule.ts
```

Modules that accept parameters can be passed those parameters at the command line via a json string:

```shell
npx hardhat deploy --parameters "{\"IncAmount\": 5}" ParamModule.js
# Ensure you have properly escaped the json string
```

Next, dig deeper into defining modules:

[Creating modules for deployment](./creating-modules-for-deployment.md)
