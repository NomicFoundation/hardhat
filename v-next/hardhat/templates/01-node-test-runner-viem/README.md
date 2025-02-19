# Hardhat 3 Alpha: `node:test` and `viem` example project

> **WARNING**: This example project uses Hardhat 3, which is still in development. Hardhat 3 is not yet intended for production use.

Welcome to the Hardhat 3 alpha version! This project showcases some of the changes and new features coming in Hardhat 3.

To learn more about the Hardhat 3 alpha, please visit [its tutorial](https://hardhat.org/hardhat3-preview). To share your feedback, join our [Hardhat 3 Preview](https://t.me/+vWqXXHGklFQzZTUx) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new?template=hardhat-3-alpha.yml) in our GitHub issue tracker.

## Project Overview

This example project includes:

- A simple Hardhat configuration file.
- Foundry-compatible Solidity unit tests.
- TypeScript integration tests using [`node:test`](nodejs.org/api/test.html), the new Node.js native test runner, and [`viem`](https://viem.sh/).
- Examples demonstrating how to connect to different types of networks, including locally simulating OP mainnet.

## Navigating the Project

To get the most out of this example project, we recommend exploring the files in the following order:

1. Read the `hardhat.config.ts` file, which contains the project configuration and explains multiple changes.
2. Review the "Running Tests" section and explore the files in the `contracts/` and `test/` directories.
3. Read the "Make a deployment to Sepolia" section and follow the instructions.

Each file includes inline explanations of its purpose and highlights the changes and new features introduced in Hardhat 3.

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test
```

You can also selectively run the Solidity or `node:test` tests:

```shell
npx hardhat test solidity
npx hardhat test node
```

### Make a deployment to Sepolia

This project includes an example Ignition module to deploy the contract. You can deploy this module to a locally simulated chain or to Sepolia.

To run the deployment to a local chain:

```shell
npx hardhat ignition deploy ignition/modules/Counter.ts
```

To run the deployment to Sepolia, you need an account with funds to send the transaction. The provided Hardhat configuration includes a Configuration Variable called `SEPOLIA_PRIVATE_KEY`, which you can use to set the private key of the account you want to use.

You can set the `SEPOLIA_PRIVATE_KEY` variable using the `hardhat-keystore` plugin or by setting it as an environment variable.

To set the `SEPOLIA_PRIVATE_KEY` config variable using `hardhat-keystore`:

```shell
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

After setting the variable, you can run the deployment with the Sepolia network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```

---

Feel free to explore the project and provide feedback on your experience with Hardhat 3 alpha!
