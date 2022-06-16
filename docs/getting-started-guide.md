# Getting Started

## Setup

Add **Ignition** to your **Hardhat** project by installing the plugin:

```shell
npm install @nomiclabs/hardhat-ignition
```

Modify your `Hardhat.config.{ts,js}` file, to include **Ignition**:

```javascript
import { HardhatUserConfig, task } from "hardhat/config";
// ...
import "@nomiclabs/hardhat-ignition";
```

Create an `./ignition` folder in your project root to contain your deployment modules.

```shell
mkdir ./ignition
```

## Write a deployment Module

Add a deployment module under the `./ignition` folder:

```typescript
// ./ignition/mymodule.ts

import { buildModule, ModuleBuilder } from "ignition"

export default buildModule("MyModule", (m: ModuleBuilder) => {
  const token = m.contract("Token")

  return { token }
})
```

Use the deployment module from a **Hardhat** script:

```typescript
// ./scripts/deploy.ts
import hre from "hardhat";
import TokenModule from "../ignition/mymodule";

async function main() {
  const { token } = await (hre as any).ignition.deploy(TokenModule);

  console.log("Token contract address", token.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run the deployment script to test against a local ephemeral **Hardhat** node:

```shell
npx hardhat run ./scripts/deploy.ts
# No need to generate any newer typings.
# Token contract address 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```
