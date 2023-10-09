# Using viem

## Overview

Most of this documentation assumes that you are using [ethers](https://docs.ethers.org/v6/) as your connection library, but you can also use Hardhat with [viem](https://viem.sh/docs/introduction.html), a more lightweight and type-safe alternative. This guide explains how to setup a project that uses the viem-based Toolbox instead of the main one.

## Installation

To kickstart a Hardhat project with Typescript and `viem`, you can follow these steps:

1. Initialize a new npm project in an empty directory:

    ```bash
    npm init -y
    ```

2. Install `hardhat` and the `hardhat-toolbox-viem` plugin:

    ```bash
    npm i hardhat @nomicfoundation/hardhat-toolbox-viem
    ```

    **Note:** you might want to pin viem-related dependencies because viem does not strictly follow semantic versioning for type changes. You can read more [here](#managing-types-and-version-stability).

3. Create a `tsconfig.json` file with the following content:

    ```json
    {
      "compilerOptions": {
        "target": "es2020",
        "module": "commonjs",
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,
        "strict": true,
        "skipLibCheck": true,
        "resolveJsonModule": true
      }
    }
    ```

4. Create a `hardhat.config.ts` file with the following content:

    ```tsx
    import { HardhatUserConfig } from "hardhat/config";
    import "@nomicfoundation/hardhat-toolbox-viem";

    const config: HardhatUserConfig = {
      solidity: {
        version: "{RECOMMENDED_SOLC_VERSION}",
      },
    };

    export default config;
    ```

## Quick Start

### Clients

Viem provides a set of interfaces to interact with the blockchain. The `hardhat-viem` plugin wraps these interfaces and pre-configures them based on your Hardhat project settings, offering a more Hardhat-friendly experience.

These interfaces are called **clients**, and each one is tailored to a specific type of interaction:

- The **Public Client** is an interface to the "public” JSON-RPC API methods used to retrieve information from a node.
- The **Wallet Client** is an interface to interact with Ethereum Accounts used to retrieve accounts, execute transactions, sign messages, etc.
- The **Test Client** is an interface to the "test" JSON-RPC API methods used to perform actions that are only possible when connecting to a development node.

To start using the client interfaces, you need to import the Hardhat Runtime Environment. You can then access them through the `viem` property of the `hre` object. In the following example, we will demonstrate how to use the public and wallet clients to log the balance of an account and then send a transaction. Follow these steps:

1. Create a `scripts/clients.ts` inside your project directory.
2. Copy and paste the following code snippet into your `scripts/clients.ts` file:

    ```tsx
    import { parseEther, formatEther } from "viem";
    import hre from "hardhat";

    async function main() {
      const [bobWalletClient, aliceWalletClient] =
        await hre.viem.getWalletClients();

      const publicClient = await hre.viem.getPublicClient();
      const balanceBefore = await publicClient.getBalance({
        address: bobWalletClient.account.address,
      });

      console.log(
        `Balance of ${bobWalletClient.account.address}: ${formatEther(
          balanceBefore
        )} ETH`
      );

      const hash = await bobWalletClient.sendTransaction({
        to: aliceWalletClient.account.address,
        value: parseEther("1"),
      });

      const tx = await publicClient.waitForTransactionReceipt({ hash });

      console.log(
        `Transaction from ${tx.from} to ${tx.to} mined in block ${tx.blockNumber}`
      );

      const balanceAfter = await publicClient.getBalance({
        address: bobWalletClient.account.address,
      });

      console.log(
        `Balance of ${bobWalletClient.account.address}: ${formatEther(
          balanceAfter
        )} ETH`
      );
    }

    main()
      .then(() => {
        process.exit();
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
    ```

3. Open your terminal and run `npx hardhat run scripts/clients.ts` to execute the script.

    This will run the code and display the results in your terminal.

For more detailed documentation on clients, you can visit the [hardhat-viem plugin site](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-viem#clients) and [Viem's official site](https://viem.sh/docs/clients/intro.html).

### Contracts

In addition to the client interfaces, Viem provides functionality for interacting with contracts. The `hardhat-viem` plugin once again provides wrappers for the most useful methods. Additionally, it offers **type generation** for all your contracts, enhancing type checking and suggestions within your IDE!

To access contract methods, import the Hardhat Runtime Environment and use the `viem` property of the `hre` object, similar to how you access clients. In the following example, we'll obtain an instance of an existing contract to call one of its methods, and then use the retrieved value to deploy a different contract. Follow these steps:

1. Create a Solidity contract named `MyToken.sol` inside your project's `contract` directory and paste the following snippet:

    ```solidity
    // SPDX-License-Identifier: MIT
    pragma solidity {RECOMMENDED_SOLC_VERSION};

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

2. Compile your Solidity contract by running `npx hardhat compile`. This will generate the types for your contract inside the `artifacts` folder of your project.
3. Create a `contracts.ts` inside your project's `scripts` directory with the following content:

    ```tsx
    import hre from "hardhat";

    async function main() {
      const myToken = await hre.viem.deployContract("MyToken", [1_000_000n]);

      const initialSupply = await myToken.read.getCurrentSupply();
      console.log(`Initial supply of MyToken: ${initialSupply}`);

      await myToken.write.increaseSupply([500_000n]);
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

4. Open your terminal and run `npx hardhat run scripts/contracts.ts` to execute the script.

    This will deploy the `MyToken` contract, use the `increaseSupply()` function to increase the initial supply, and display the result in your terminal.

#### Contract Type Generation

The proper types for each contract are generated during compilation. These types are used to overload the hardhat-viem types and improve type checking and suggestions. For example, if you copy and paste the following code at the end of the `main()` function of `scripts/contracts.ts`, TypeScript would highlight it as an error:

```tsx
// The amount is required as a parameter
// TS Error: Expected 1-2 arguments, but got 0.
await myToken.write.increaseSupply();

// There is no setSupply function in the MyToken contract
// TS Error: Property 'setSupply' does not exist on type...
const tokenPrice = await myToken.write.setSupply([5000000n]);

// The first argument of the constructor arguments is expected to be an bigint
// TS Error: No overload matches this call.
const myToken2 = await hre.viem.deployContract("MyToken", ["1000000"]);
```

If you want to learn more about working with contracts, you can visit the [hardhat-viem plugin site](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-viem#contracts) and [Viem's official site](https://viem.sh/docs/contract/getContract.html).

### Testing

The `hardhat-toolbox-viem` comes with all the necessary tools to test viem contracts. In this example, we'll demonstrate how to write tests for the `MyToken` contract defined earlier. These tests cover scenarios like increasing supply and ensuring that certain operations revert as expected.

1. Create a `test/my-token.ts` file inside your project's directory an copy the following code snippet:

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

2. Open your terminal and run `npx hardhat test` to run your tests.

### Managing Types and Version Stability

Viem adopts a particular [approach to handling changes in types within their codebase](https://viem.sh/docs/typescript.html#typescript). They consider these changes as non-breaking and typically release them as patch version updates. This approach has implications for users of both `hardhat-viem` and `hardhat-toolbox-viem`.

**Option 1: Pinning Versions (Recommended for Stability)**

Viem recommends pinning their package version in your project. However, it's important to note that if you choose to follow this recommendation, you should also pin the versions of `hardhat-viem` and `hardhat-toolbox-viem`. This ensures version compatibility and stability for your project. However, it's worth mentioning that by pinning versions, you may miss out on potential improvements and updates shipped with our plugins.

To pin the versions, follow these steps:

1. Install `hardhat-viem`, `hardhat-toolbox-viem`, and `viem` as dependencies:

    ```tsx
    npm i @nomicfoundation/hardhat-toolbox-viem @nomicfoundation/hardhat-viem viem
    ```

2. Open your `package.json` file and remove the caret character (**`^`**) from in front of the three packages. This pins the versions of these packages:

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
