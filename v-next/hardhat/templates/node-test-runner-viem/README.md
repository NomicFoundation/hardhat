# A TypeScript Hardhat project using Node Test Runner and Viem

> WARNING: This demonstration project is still in development. It is part of the Hardhat v3 upgrade. It is not for production use.

> NOTE: There are several plugins from the Hardhat toolbox that have not been ported to Hardhat v3 yet.

This project demonstrates basic Hardhat usecases within a TypeScript project. It comes with:

- a minimal Hardhat configuration file
- JS/TS integration tests
- Solidity Tests
- A script demonstrating how to deploy a contract to an in-memory Hardhat node simulating Base (an Optimism l2 chain)

## Usage

### Testing

For integration testing it uses the Node Test Runner and the Viem library for interacting with Ethereum nodes.

Try running the following commands to see Hardhat's testing in action:

```shell
# Run the both the Node Test Runner integration test suite
# and the Solidity Test suite
npx hardhat3 test
```

### Multi-chain support

To deploy a contract to an in-memory Hardhat node simulating Base (an Optimism l2 chain), run:

```shell
npx hardhat3 run scripts/deploy-counter-contract.ts
```
