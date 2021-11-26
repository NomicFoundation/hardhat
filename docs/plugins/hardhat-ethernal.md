---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/tryethernal/hardhat-ethernal/tree/master)
:::

# Hardhat plugin for Ethernal

[Ethernal](https://www.tryethernal.com) is a block explorer for EVM-based chains. You can use it with your local chains (the Hardhat network for example), or for chains deployed on remote servers.

It allows you to interact with contracts by automatically generating an UI for all read/write methods. You can also read contract variables in any blocks.

To use Ethernal, you need to synchronize blocks, transactions & artifacts with the dashboard. This plugin allows you to easily do that instead of having to run the CLI separately.

If you are looking for more detailed doc about Ethernal: https://doc.tryethernal.com

## Installation

Add ```hardhat-ethernal``` to your ```package.json```, and run ```npm install``` or ```yarn```

## Synchronize blocks & transactions

In your ```hardhat-config.js```file, require the plugin:
```js
require('hardhat-ethernal');
````

That's it! Blocks and transactions will now be synchronized.

### Options

It's possible to disable the synchronization by setting ```ethernalSync``` to ```false``` on the ```hre``` object.

You can also specify which workspace you want to synchronize blocks & transactions to (default to the last one used in the dashboard).

By default, transactions will be traced using ```experimentalAddHardhatNetworkMessageTraceHook```, showing CALLx and CREATEx operations in the dashboard.
You can disable this feature with the ```ethernalTrace``` flag.
```js
extendEnvironment((hre) => {
    hre.ethernalSync = true;
    hre.ethernalWorkspace = 'Workspace';
    hre.ethernalTrace = false;
});
```

## Synchronize artifacts

In your deploy script, first require the plugin:
```js
const ethernal = require('hardhat-ethernal');
```
Then, push your artifacts to Ethernal, after deploying your contract:

/!\ The name parameter needs to match the name of the contract
```js
const Greeter = await hre.ethers.getContractFactory("Greeter");
const greeter = await Greeter.deploy("Hello, Hardhat!");
await hre.ethernal.push({
    name: 'Greeter',
    address: greeter.address
});
```
The following fields will be synchronized:
- contractName
- abi
- ast
- source
