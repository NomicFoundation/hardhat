# Hardhat 3 Alpha: `mocha` and `ethers` example project

> **WARNING**: This example project uses Hardhat 3, which is still in development. Hardhat 3 is not yet intended for production use.

Welcome to the Hardhat 3 alpha version! This project showcases some of the changes and new features coming in Hardhat 3.

To learn more about the Hardhat 3 alpha, please visit [its Docs Hub](https://www.notion.so/nomicfoundation/Hardhat-3-alpha-Docs-Hub-131578cdeaf580e89e8dca57b0d036c3).

## Project Overview

This example project includes:

- A simple Hardhat configuration file
- TypeScript integration tests using `mocha` and ethers.js
- Foundry-compatible Solidity tests, including the usage of `forge-std`
- Examples demonstrating how to connect to different types of networks, including simulating an Optimism network
- A script that deploys a contract to Optimism Sepolia using Hardhat's new keystore capabilities

## Navigating the Project

To get the most out of this example project, we recommend exploring the files in the following order:

1. Read the `hardhat.config.ts` file, which contains the project configuration and explains multiple changes.
2. Review the "Running Tests" section and explore the files in the `contracts/` and `test/` directories.
3. Read the "Sending a Transaction to Optimism Sepolia" section, follow the instructions, and examine the `scripts/send-op-tx.ts` file.

Each file includes inline explanations of its purpose and highlights the changes and new features introduced in Hardhat 3.

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat3 test
```

You can also selectively run the Solidity or `mocha` tests:

```shell
npx hardhat3 test solidity
npx hardhat3 test mocha
```

### Sending a Transaction to Optimism Sepolia

This project includes an example script that sends a simple transaction to Optimism Sepolia. You can run the script using either the actual Optimism Sepolia network or a simulated version that behaves exactly like the real network.

To run the script with EDR in Optimism mode:

```shell
npx hardhat3 run scripts/send-op-tx.ts --network edrOpSepolia
```

To run the script with Optimism Sepolia, you need an account with funds to send the transaction. The provided Hardhat configuration includes a Configuration Variable called `OPTIMISM_SEPOLIA_PRIVATE_KEY`, which you can use to set the private key of the account you want to use.

You can set the `OPTIMISM_SEPOLIA_PRIVATE_KEY` variable using the `hardhat-keystore` plugin or by setting it as an environment variable.

> **WARNING**: The private key is currently stored unencrypted. Full encryption will be included before the beta release.

To set the `OPTIMISM_SEPOLIA_PRIVATE_KEY` config variable using `hardhat-keystore`:

```shell
npx hardhat3 keystore set OPTIMISM_SEPOLIA_PRIVATE_KEY
```

After setting the variable, you can run the script with the Optimism Sepolia network:

```shell
npx hardhat3 run scripts/send-op-tx.ts --network opSepolia
```

---

Feel free to explore the project and provide feedback on your experience with Hardhat 3 alpha!
