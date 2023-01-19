# Multisig Example for Ignition

This hardhat project is an example of using ignition to deploy a basic Multisig contract, send a transaction via the multisig, wait for an external confirmation, then resume the deploy to execute the confirmed transaction.

The module demonstrates how `m.event(...)` can be used to pause deployment until after an event matching the given filter has been emitted on-chain.

## Deploying

To run the ignition deploy against a local hardhat node, first start the node:

```shell
npx hardhat node
```

In a different tab, run the MultisigModule to deploy the multisig contract and submit a transaction:

```shell
npx hardhat deploy MultisigModule.js --network localhost
```

The run should deploy and submit the transaction successfully but show the multisig/confirmation as pending and so the deployment is on `Hold`.

Confirm the transaction (externally to the deployment) with a hardhat scripts under `./scripts`:

```shell
npx hardhat run ./scripts/confirmTransaction.js --network localhost
```

The submitted transaction is now confirmed within the multisig.

A rerun of the deployment will skip to the previously on hold `Multisig/Confirmation` step, and proceed to completion from there:

```shell
npx hardhat deploy MultisigModule.js --network localhost
```

## Test

To run the hardhat tests using ignition:

```shell
yarn test:examples
```
