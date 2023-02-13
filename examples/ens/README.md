# ENS Example for Ignition

This hardhat project is an example of using ignition to deploy the ENS system of contracts, based on the [Deploying ens on a private chain](https://docs.ens.domains/deploying-ens-on-a-private-chain#migration-file-example) from the ens docs.

## Deploying

To run the ignition deploy against the ephemeral hardhat network:

```shell
npx hardhat deploy ENS.js
```

To run a deploy of ENS with a test registrar against the local node:

```shell
npx hardhat node
# In another terminal
npx hardhat deploy test-registrar.js --network localhost
```

## Test

To run the hardhat tests using ignition:

```shell
npm run test:examples
```
