# Hardhat Sample for Hardhat Ignition

This project is a basic example of how to use Hardhat Ignition with contract systems that use an upgradeable proxy pattern.

## Deploying

To run the Ignition deploy against the ephemeral hardhat network:

```shell
npx hardhat ignition deploy ./ignition/modules/ProxyModule.js

# or to deploy the upgrade module
npx hardhat ignition deploy ./ignition/modules/UpgradeModule.js
```

## Test

To run the hardhat tests using Ignition:

```shell
npm run test
```
