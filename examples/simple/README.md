# Simple Example for Ignition

This hardhat project is an example of using ignition to deploy a simple set of contracts.

See the

## Deploying

To run the ignition deploy against the ephemeral hardhat network:

```shell
npx hardhat deploy Simple.js --parameters "{\"IncAmount\": 42}"
```

## Test

To run the hardhat tests using ignition:

```shell
yarn test:examples
```
