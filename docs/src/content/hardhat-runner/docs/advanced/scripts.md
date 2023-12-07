# Writing scripts with Hardhat

<!-- TODO: We should write this guide based on a different common use case for scripts now that Ignition exists -->

In this guide we will go through the steps of creating a script with Hardhat. For a general overview of using Hardhat refer to the [Getting started guide](../getting-started/index.md).

You can write your own custom scripts that can use all of Hardhat's functionality. A classic use case is writing a deployment script for your smart contracts.

There are two ways of writing a script that accesses the [Hardhat Runtime Environment](../advanced/hardhat-runtime-environment.md).

## Running scripts with the Hardhat CLI

You can write scripts that access the [Hardhat Runtime Environment](../advanced/hardhat-runtime-environment.md)'s properties as global variables.

These scripts must be run through Hardhat: `npx hardhat run script.js`.

This makes it easy to port scripts that were developed for other tools and that inject variables into the global state.

## Standalone scripts: using Hardhat as a library

The second option leverages Hardhat's architecture to allow for more flexibility. Hardhat has been designed as a library, allowing you to get creative and build standalone CLI tools that access your development environment. This means that by simply requiring it:

```js
const hre = require("hardhat");
```

You can get access to all your tasks and plugins. To run these scripts you simply go through node: `node script.js`.

To try this out, let's look at [a fresh Hardhat project](../guides/project-setup.md). Run `npx hardhat init` and go through the steps to create a JavaScript project. When you're done, your project directory should look like this:

```
$ ls -l
total 400
drwxr-xr-x    3 fzeoli  staff      96 Jul 30 15:27 contracts
-rw-r--r--    1 fzeoli  staff     195 Jul 30 15:27 hardhat.config.js
drwxr-xr-x  502 fzeoli  staff   16064 Jul 30 15:31 node_modules
-rw-r--r--    1 fzeoli  staff  194953 Jul 30 15:31 package-lock.json
-rw-r--r--    1 fzeoli  staff     365 Jul 30 15:31 package.json
drwxr-xr-x    3 fzeoli  staff      96 Jul 30 15:27 scripts
drwxr-xr-x    3 fzeoli  staff      96 Jul 30 15:27 test
```

Inside `scripts/` you will find `deploy.js`. Read through its comments to have a better idea of what it does.

<<< @/../packages/hardhat-core/sample-projects/javascript/scripts/deploy.js

Now run the script:

```
$ node scripts/deploy.js
Lock with 1 ETH deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

By accessing the [Hardhat Runtime Environment](../advanced/hardhat-runtime-environment.md) at the top, you are allowed to run the script in a standalone fashion.

Hardhat always runs the compile task when it's invoked via `npx hardhat run`, but in a standalone fashion you may want to call compile manually to make sure everything is compiled. This can be done by calling `hre.run("compile")`. Add the following line at the beginning of the `main` function and re-run the script with node:

```js
await hre.run("compile");
```

```
$ node scripts/deploy.js
Nothing to compile
Lock with 1 ETH deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Hardhat arguments

You can still pass arguments to Hardhat when running a standalone script. This is done by setting environment variables. Some of these are:

- `HARDHAT_NETWORK`: Sets the network to connect to.

- `HARDHAT_SHOW_STACK_TRACES`: Enables JavaScript stack traces of expected errors.

- `HARDHAT_VERBOSE`: Enables Hardhat verbose logging.

- `HARDHAT_MAX_MEMORY`: Sets the maximum amount of memory that Hardhat can use.

For example, instead of doing `npx hardhat --network localhost run script.js`, you can do `HARDHAT_NETWORK=localhost node script.js`. Check our [Environment variables](/hardhat-runner/docs/reference/environment-variables) reference to learn more about this.
