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

Hardhat network now supports simulating Optimism L2 chains. You can see an example of a local Hardhat network configured to run as an Optimism L2 in the `./hardhat.config.ts` file for the `edrOp` network:

```js
edrOp: {
  type: "edr",
  chainId: 10,
  chainType: "optimism",
  forkConfig: {
    jsonRpcUrl: "https://mainnet.optimism.io",
  },
},
```

A script demonstrating the sending of an L2 transaction is included as `./scripts/send-op-tx.ts`, to run it against the local `edrOp` Optimism network, run:

```shell
npx hardhat3 run scripts/send-op-tx.ts --network edrOp
```

To run the same script against the Optimism mainnet, first set the `OPTIMISM_PRIVATE_KEY` config variable, with the private key of the account you want to use to send the transaction:

> WARNING: the private key is stored unencrypted to file. Full encryption will be included in a future release.

```shell
npx hardhat3 keystore set OPTIMISM_PRIVATE_KEY
# Enter secret to store: ****************************************************************
```

Run the script with the Optimism mainnet network:

```shell
npx hardhat3 run scripts/send-op-tx.ts --network op
```
