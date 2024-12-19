# Upgradeable Contract Example for Hardhat Ignition

This project is a basic example of how to use Hardhat Ignition with contract systems that use an upgradeable proxy pattern.

## Deploying

To deploy the an example proxy contract against the ephemeral Hardhat network:

```shell
npx hardhat ignition deploy ./ignition/modules/ProxyModule.js
```

To deploy an example of a proxy contract being upgraded against the ephemeral Hardhat network:

```shell
npx hardhat ignition deploy ./ignition/modules/UpgradeModule.js
```

## Test

To run the Hardhat tests using Ignition:

```shell
npm run test
```
