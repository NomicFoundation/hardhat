# Writing scripts with Hardhat

In this guide we will go through the steps of creating a script with Hardhat. For a general overview of using Hardhat refer to the [Getting started guide](../getting-started/index.md).

You can write your own custom scripts that can use all of Hardhat's functionality. A classic use case is writing a script that prints the list of available accounts.

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

To try this out, create a new directory called `scripts` in your project's root directory. Then, inside that directory, create a file called `accounts.js` with the following content:

```js
const hre = require("hardhat");

async function main() {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Now run the script:

```sh
node scripts/accounts.js
```

By accessing the [Hardhat Runtime Environment](../advanced/hardhat-runtime-environment.md) at the top, you are allowed to run the script in a standalone fashion.

### Hardhat arguments

You can still pass arguments to Hardhat when running a standalone script. This is done by setting environment variables. Some of these are:

- `HARDHAT_NETWORK`: Sets the network to connect to.

- `HARDHAT_SHOW_STACK_TRACES`: Enables JavaScript stack traces of expected errors.

- `HARDHAT_VERBOSE`: Enables Hardhat verbose logging.

- `HARDHAT_MAX_MEMORY`: Sets the maximum amount of memory that Hardhat can use.

For example, instead of doing `npx hardhat --network localhost run script.js`, you can do `HARDHAT_NETWORK=localhost node script.js`. Check our [Environment variables](/hardhat-runner/docs/reference/environment-variables) reference to learn more about this.
