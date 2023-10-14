# Using parameters

**TODO**

Deploying a module is done using the Hardhat Ignition deploy task:

```sh
npx hardhat ignition deploy ./ignition/modules/LockModule.js
```

Module parameters can be passed as a json file. Within the json file parameter values are indexed first by the `ModuleId`, then by the parameter name:

```json
// ignition/modules/LockModule.config.json

{
  "LockModule": {
    "unlockTime": 4102491600
  }
}
```

The deploy task accepts the path to the module parameters json file via the `parameters` option:

```bash
npx hardhat ignition deploy --parameters ./ignition/modules/LockModule.config.json ./ignition/modules/LockModule.js
```

By default the deploy task will deploy to an ephemeral Hardhat network. To target a network from your Hardhat config, you can pass its name to the network flag:

```sh
npx hardhat ignition deploy ./ignition/modules/LockModule.js --network mainnet
```
