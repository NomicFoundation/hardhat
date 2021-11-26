# Writing scripts with Hardhat

In this guide we will go through the steps of creating a script with Hardhat. For a general overview of using Hardhat refer to the [Getting started guide].

You can write your own custom scripts that can use all of Hardhat's functionality. A classic use case is writing a deployment script for your smart contracts.

There are two ways of writing a script that accesses the [Hardhat Runtime Environment].

::: tip

Hardhat scripts are useful for simple things that don't take user arguments, and for integrating with external tools that aren't well suited for the Hardhat CLI, like a Node.js debugger.

If you want to automate more complex things, and receive user arguments, you can learn how to [create your own tasks here](../guides/create-task.md).

:::

## Hardhat CLI dependant

You can write scripts that access the [Hardhat Runtime Environment]'s properties as global variables.

These scripts must be run through Hardhat: `npx hardhat run script.js`.

This makes it easy to port scripts that were developed for other tools and that inject variables into the global state.

## Standalone scripts: using Hardhat as a library

The second option leverages Hardhat's architecture to allow for more flexibility. Hardhat has been designed as a library, allowing you to get creative and build standalone CLI tools that access your development environment. This means that by simply requiring it:

```js
const hre = require("hardhat");
```

You can get access to all your tasks and plugins. To run these scripts you simply go through node: `node script.js`.

To try this out, let's look at a fresh Hardhat project. Run `npx hardhat` and go through the steps to create a sample project. When you're done your project directory should look like this:

```
$ ls -l
total 400
-rw-r--r--    1 fzeoli  staff     195 Jul 30 15:27 hardhat.config.js
drwxr-xr-x    3 fzeoli  staff      96 Jul 30 15:27 contracts
drwxr-xr-x  502 fzeoli  staff   16064 Jul 30 15:31 node_modules
-rw-r--r--    1 fzeoli  staff  194953 Jul 30 15:31 package-lock.json
-rw-r--r--    1 fzeoli  staff     365 Jul 30 15:31 package.json
drwxr-xr-x    3 fzeoli  staff      96 Jul 30 15:27 scripts
drwxr-xr-x    3 fzeoli  staff      96 Jul 30 15:27 test
```

Inside `scripts/` you will find `sample-script.js`. Read through its comments to have a better idea of what it does.

<<< @/../packages/hardhat-core/sample-projects/basic/scripts/sample-script.js

Done? Before running the script with `node` you need to declare `ethers`. This is needed because Hardhat won't be injecting it on the global scope as it does when calling the `run` task.

```js{2}
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  //...
}
```

Now you're ready to run the script:

```
$ node scripts/sample-script.js
Greeter address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

By accessing the [Hardhat Runtime Environment] at the top, you are allowed to run the script in a standalone fashion. Hardhat always runs the compile task when it's invoked via `npx hardhat run`, but in a standalone fashion you may want to call compile manually to make sure everything is compiled. This is done by calling `hre.run('compile')`. Uncomment the following line and re-run the script with `node`:

```js
await hre.run("compile");
```

```
$ node scripts/sample-script.js
Greeter address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Hardhat arguments

You can still pass arguments to Hardhat when using it as a library. This is done by setting environment variables. These are:

- `HARDHAT_NETWORK`: Sets the network to connect to.

- `HARDHAT_SHOW_STACK_TRACES`: Enables JavaScript stack traces of expected errors.

- `HARDHAT_VERBOSE`: Enables Hardhat verbose logging.

- `HARDHAT_MAX_MEMORY`: Sets the maximum amount of memory that Hardhat can use.

[hardhat runtime environment]: ../advanced/hardhat-runtime-environment.md
[getting started guide]: ../getting-started/README.md
