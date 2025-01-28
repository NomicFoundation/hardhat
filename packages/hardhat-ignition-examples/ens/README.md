# ENS Example for Hardhat Ignition

This Hardhat project is an example of using ignition to deploy the ENS system of contracts, based on the [Deploying ens on a private chain](https://docs.ens.domains/deploying-ens-on-a-private-chain#migration-file-example) from the ens docs.

## Deploying

To run the Ignition deploy against the ephemeral Hardhat network:

```shell
npx hardhat ignition deploy ./ignition/modules/ENS.js
```

To run a deploy of ENS with a test registrar against the local node:

```shell
npx hardhat node
# In another terminal
npx hardhat ignition deploy ./ignition/modules/test-registrar.js --network localhost
```

## Test

To run the hardhat tests using Ignition:

```shell
npm run test
```
