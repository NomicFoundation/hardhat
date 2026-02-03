# hardhat-verify

[Hardhat](https://hardhat.org) plugin to verify the source of code of deployed contracts.

## Installation

> This plugin is part of [Viem Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-viem) and [Ethers+Mocha Hardhat Toolbox](https://hardhat.org/plugins/nomicfoundation-hardhat-toolbox-mocha-ethers). If you are using any of those toolboxes, there's nothing else you need to do.

To install this plugin, run the following command:

```bash
npm install --save-dev @nomicfoundation/hardhat-verify
```

In your `hardhat.config.ts` file, import the plugin and add it to the `plugins` array:

```ts
import { defineConfig } from "hardhat/config";
import hardhatVerify from "@nomicfoundation/hardhat-verify";

export default defineConfig({
  plugins: [hardhatVerify],
});
```

## Usage

### Verifying on Etherscan

You need to add the following Etherscan config in your `hardhat.config.ts` file

```typescript
import { defineConfig } from "hardhat/config";

export default defineConfig({
  verify: {
    etherscan: {
      // Your API key for Etherscan
      // Obtain one at https://etherscan.io/
      apiKey: "<ETHERSCAN_API_KEY>",
    },
  },
});
```

We recommend using a [configuration variable](https://hardhat.org/docs/learn-more/configuration-variables) to set sensitive information like API keys.

```typescript
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  verify: {
    etherscan: {
      // Your API key for Etherscan
      // Obtain one at https://etherscan.io/
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
});
```

Run the `verify` task passing the network where it's deployed, the address of the contract, and the constructor arguments that were used to deploy it (if any):

```bash
npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
```

### Programmatic verification

You can also verify contracts programmatically by using the `verifyContract` function from the plugin:

```typescript
import hre from "hardhat";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

await verifyContract(
  {
    address: "DEPLOYED_CONTRACT_ADDRESS",
    constructorArgs: ["Constructor argument 1"],
    provider: "etherscan", // or "blockscout", or "sourcify"
  },
  hre,
);
```

> Note: The `verifyContract` function is not re-exported from the Hardhat toolboxes, so you need to install the plugin and import it directly from `@nomicfoundation/hardhat-verify/verify`.

## Advanced Usage for Plugin Authors

If you're building a Hardhat plugin that needs direct access to the Etherscan API (for example, to verify proxy contracts or make custom API calls), you can access the Etherscan instance through `network.connect()`.

### Accessing the Etherscan Instance

```typescript
import type { HardhatRuntimeEnvironment } from "hardhat/types";

export async function myCustomVerificationTask(hre: HardhatRuntimeEnvironment) {
  const { verifier } = await hre.network.connect();

  // Access Etherscan instance
  const etherscan = verifier.etherscan;

  // Check if a contract is already verified
  const isVerified = await etherscan.isVerified("0x1234...");

  // Get the contract URL on the block explorer
  const url = await etherscan.getContractUrl("0x1234...");

  // Submit a contract for verification
  const guid = await etherscan.verify({
    contractAddress: "0x1234...",
    compilerInput: {
      /* compiler input JSON */
    },
    contractName: "contracts/MyContract.sol:MyContract",
    compilerVersion: "v0.8.19+commit.7dd6d404",
    constructorArguments: "0x...",
  });

  // Poll for verification status
  const result = await etherscan.pollVerificationStatus(
    guid,
    "0x1234...",
    "MyContract",
  );
}
```

### Making Custom API Calls

For API endpoints not covered by the standard methods, use `customApiCall()`:

```typescript
const { verifier } = await hre.network.connect();

// Make a custom API call (apikey and chainid are added automatically)
const response = await verifier.etherscan.customApiCall({
  module: "contract",
  action: "getsourcecode",
  address: "0x1234...",
});

// Check the response
if (response.status === "1") {
  console.log("Contract source:", response.result);
} else {
  console.error("Error:", response.message);
}
```

### API Reference

For complete type definitions and available methods, see the exported types:

- `Etherscan` - The main interface for Etherscan API access
- `EtherscanResponseBody` - Structure of API response bodies
- `EtherscanCustomApiCallOptions` - Options for custom API calls
- `EtherscanVerifyArgs` - Arguments for contract verification

### Build profiles and verification

When no build profile is specified, this plugin defaults to `production`. However, tasks like `build` and `run` default to the `default` build profile. If your contracts are compiled with a different profile than the one used for verification, the compiled bytecode may not match the deployed bytecode, causing verification to fail.

To avoid this, make sure to build and verify using the same profile:

```bash
npx hardhat build --build-profile production
npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
```

If you're using the `verifyContract` function programmatically through a script, pass the build profile when running it:

```bash
npx hardhat run --build-profile production scripts/verify.ts
```

## How it works

The plugin works by fetching the bytecode in the given address and using it to check which contract in your project corresponds to it. Besides that, some sanity checks are performed locally to make sure that the verification won't fail.
