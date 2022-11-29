# Multisig Example for Ignition

This hardhat project is an example of using ignition to deploy a basic Multisig contract.

The module demonstrates how `m.awaitEvent(...)` can be used to pause deployment until after an event matching the given filter has been emitted on-chain

## Deploying

To run the ignition deploy against the ephemeral hardhat network:

```shell
npx hardhat deploy Multisig.js
```

## Test

To run the hardhat tests using ignition:

```shell
yarn test:examples
```
