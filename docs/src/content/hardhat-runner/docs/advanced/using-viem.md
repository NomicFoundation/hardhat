# Using Viem

## Overview

Most of this documentation assumes that you are using [ethers](https://docs.ethers.org/v6/) as your connection library, but you can also use Hardhat with [Viem](https://viem.sh/docs/introduction.html), a more lightweight and type-safe alternative. This guide explains how to setup a project that uses [the Viem-based Toolbox](/hardhat-runner/plugins/nomicfoundation-hardhat-toolbox-viem) instead of the main one.

## Quick start

To create a new Hardhat project with Viem, initialize a project as [you normally do](/hardhat-runner/docs/guides/project-setup), but select the _“Create a TypeScript project (with Viem)”_ option.

You can also try `hardhat-viem` in an existing project, even if it uses `hardhat-ethers`, since both plugins are compatible. To do this, just install the `@nomicfoundation/hardhat-viem` package and add it to your config.

### Clients

Viem provides a set of interfaces to interact with the blockchain. `hardhat-viem` wraps and auto-configures these based on your Hardhat project settings for a seamless experience.

These **clients** are tailored for specific interactions:

- **Public Client** fetches node information from the “public” JSON-RPC API.
- **Wallet Client** interacts with Ethereum Accounts for tasks like transactions and message signing.
- **Test Client** performs actions that are only available in development nodes.

You can access clients via `hre.viem`. Read our documentation to learn more about the [HRE](/hardhat-runner/docs/advanced/hardhat-runtime-environment). Find below an example of how to use the public and wallet clients:

1. Create a `scripts/clients.ts` inside your project directory.
2. Add this code to `scripts/clients.ts`:

   ```tsx
   import { parseEther, formatEther } from "viem";
   import hre from "hardhat";

   async function main() {
     const [bobWalletClient, aliceWalletClient] =
       await hre.viem.getWalletClients();

     const publicClient = await hre.viem.getPublicClient();
     const bobBalance = await publicClient.getBalance({
       address: bobWalletClient.account.address,
     });

     console.log(
       `Balance of ${bobWalletClient.account.address}: ${formatEther(
         bobBalance
       )} ETH`
     );

     const hash = await bobWalletClient.sendTransaction({
       to: aliceWalletClient.account.address,
       value: parseEther("1"),
     });
     await publicClient.waitForTransactionReceipt({ hash });
   }

   main()
     .then(() => process.exit())
     .catch((error) => {
       console.error(error);
       process.exit(1);
     });
   ```

3. Run `npx hardhat run scripts/clients.ts`.

For more detailed documentation on clients, you can visit the [hardhat-viem plugin site](/hardhat-runner/plugins/nomicfoundation-hardhat-viem#clients) and [Viem's official site](https://viem.sh/docs/clients/intro.html).

### Contracts

Viem also provides functionality for interacting with contracts, and `hardhat-viem` provides wrappers for the most useful methods. Plus, it generates types for your contracts, enhancing type-checking and IDE suggestions.

Use the `hre.viem` object to get these helpers, similar to how clients are used. The next example shows how to get a contract instance and call one of its methods:

1. Create a `MyToken.sol` file inside your project’s `contracts` directory:

   ```solidity
   // SPDX-License-Identifier: MIT
   pragma solidity ^{RECOMMENDED_SOLC_VERSION};

   contract MyToken {
     uint256 public totalSupply;

     constructor(uint256 _initialSupply) {
       totalSupply = _initialSupply;
     }

     function increaseSupply(uint256 _amount) public {
       require(_amount > 0, "Amount must be greater than 0");
       totalSupply += _amount;
     }

     function getCurrentSupply() public view returns (uint256) {
       return totalSupply;
     }
   }
   ```

2. Run `npx hardhat compile` to compile your contracts and produce types in the `artifacts` directory.
3. Create a `contracts.ts` inside the `scripts` directory:

   ```tsx
   import hre from "hardhat";

   async function main() {
     const myToken = await hre.viem.deployContract("MyToken", [1_000_000n]);

     const initialSupply = await myToken.read.getCurrentSupply();
     console.log(`Initial supply of MyToken: ${initialSupply}`);

     const hash = await myToken.write.increaseSupply([500_000n]);
     // increaseSupply sends a tx, so we need to wait for it to be mined
     const publicClient = await hre.viem.getPublicClient();
     await publicClient.waitForTransactionReceipt({ hash });

     const newSupply = await myToken.read.getCurrentSupply();
     console.log(`New supply of MyToken: ${newSupply}`);
   }

   main()
     .then(() => process.exit(0))
     .catch((error) => {
       console.error(error);
       process.exit(1);
     });
   ```

4. Open your terminal and run `npx hardhat run scripts/contracts.ts`. This will deploy the `MyToken` contract, call the `increaseSupply()` function, and display the new supply in your terminal.

#### Contract Type Generation

The proper types for each contract are generated during compilation. These types are used to overload the `hardhat-viem` types and improve type checking and suggestions. For example, if you copy and paste the following code at the end of the `main()` function of `scripts/contracts.ts`, TypeScript would highlight it as an error:

```tsx
// The amount is required as a parameter
// TS Error: Expected 1-2 arguments, but got 0.
await myToken.write.increaseSupply();

// There is no setSupply function in the MyToken contract
// TS Error: Property 'setSupply' does not exist on type...
const tokenPrice = await myToken.write.setSupply([5000000n]);

// The first argument of the constructor arguments is expected to be a bigint
// TS Error: No overload matches this call.
const myToken2 = await hre.viem.deployContract("MyToken", ["1000000"]);
```

If you want to learn more about working with contracts, you can visit the [`hardhat-viem` plugin site](/hardhat-runner/plugins/nomicfoundation-hardhat-viem#contracts) and [Viem's official site](https://viem.sh/docs/contract/getContract.html).

### Testing

In this example, we’ll test the `MyToken` contract, covering scenarios like supply increase and expected operation reverts.

1. Create a `test/my-token.ts` file:

   ```tsx
   import hre from "hardhat";
   import { assert, expect } from "chai";
   import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

   // A deployment function to set up the initial state
   const deploy = async () => {
     const myToken = await hre.viem.deployContract("MyToken", [1_000_000n]);

     return { myToken };
   };

   describe("MyToken Contract Tests", function () {
     it("should increase supply correctly", async function () {
       // Load the contract instance using the deployment function
       const { myToken } = await loadFixture(deploy);

       // Get the initial supply
       const initialSupply = await myToken.read.getCurrentSupply();

       // Increase the supply
       await myToken.write.increaseSupply([500_000n]);

       // Get the new supply after the increase
       const newSupply = await myToken.read.getCurrentSupply();

       // Assert that the supply increased as expected
       assert.equal(initialSupply + 500_000n, newSupply);
     });

     it("should revert when increasing supply by less than 1", async function () {
       // Load the contract instance using the deployment function
       const { myToken } = await loadFixture(deploy);

       // Attempt to increase supply by 0 (which should fail)
       await expect(myToken.write.increaseSupply([0n])).to.be.rejectedWith(
         "Amount must be greater than 0"
       );
     });
   });
   ```

2. Open your terminal and run `npx hardhat test` to run these tests.

### Managing Types and Version Stability

Viem adopts a particular [approach to handling changes in types within their codebase](https://viem.sh/docs/typescript.html#typescript). They consider these changes as non-breaking and typically release them as patch version updates. This approach has implications for users of both `hardhat-viem` and `hardhat-toolbox-viem`.

**Option 1: Pinning Versions (Recommended for Stability)**

Viem recommends pinning their package version in your project. However, it's important to note that if you choose to follow this recommendation, you should also pin the versions of `hardhat-viem` and `hardhat-toolbox-viem`. This ensures version compatibility and stability for your project. However, it's worth mentioning that by pinning versions, you may miss out on potential improvements and updates shipped with our plugins.

To pin the versions, follow these steps:

1. Explicitly install `hardhat-viem`, `hardhat-toolbox-viem`, and `viem`. This will add these dependencies to your `package.json` file:

   ```tsx
   npm i @nomicfoundation/hardhat-toolbox-viem @nomicfoundation/hardhat-viem viem
   ```

2. Open your `package.json` file and remove the caret character (**`^`**) from the versions of the three packages:

   ```json
   {
     "dependencies": {
       "@nomicfoundation/hardhat-toolbox-viem": "X.Y.Z",
       "@nomicfoundation/hardhat-viem": "X.Y.Z",
       "viem": "X.Y.Z"
     }
   }
   ```

**Option 2: Stay Updated (Recommended for Features)**

Alternatively, you can choose not to pin versions and remain aware that your project's types may break if a newer version of `viem` is installed. By opting for this approach, you won't miss out on important upgrades and features, but you might need to address type errors occasionally.

Both options have their merits, and your choice depends on whether you prioritize stability or staying up-to-date with the latest features and improvements.
