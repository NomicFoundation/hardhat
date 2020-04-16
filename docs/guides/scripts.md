# Writing scripts with Buidler

In this guide we will go through the steps of creating a script with Buidler. For a general overview of using Buidler refer to the [Getting started guide].

You can write your custom scripts that can use all of Buidler's functionality. A classic use case is writing a deployment script for your smart contracts. 

There are two ways of writing a script that accesses the [Buidler Runtime Environment].

## Buidler CLI dependant

You can write scripts that access the [Buidler Runtime Environment]'s properties
as global variables.

These scripts must be run through Buidler: `npx buidler run script.js`. 

This makes it easy to port scripts that were developed for other tools such as Waffle, which follows this approach,
by using the [buidler-waffle](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-waffle). 

## Standalone scripts: using Buidler as a library

The second option leverages Buidler's architecture to allow for more flexibility. Buidler has been designed as a library, allowing you to get creative and build standalone CLI tools that access your development environment. This means that by simply requiring it:

```js
const bre = require("@nomiclabs/buidler");
```

You can get access to all your tasks and plugins. To run these scripts you simply go through node: `node script.js`.

To try this out, let's look at a fresh Buidler project. Run `npx buidler` and go through the steps to create a sample project. When you're done your project directory should look like this:

```
$ ls -l
total 400
-rw-r--r--    1 fzeoli  staff     195 Jul 30 15:27 buidler.config.js
drwxr-xr-x    3 fzeoli  staff      96 Jul 30 15:27 contracts
drwxr-xr-x  502 fzeoli  staff   16064 Jul 30 15:31 node_modules
-rw-r--r--    1 fzeoli  staff  194953 Jul 30 15:31 package-lock.json
-rw-r--r--    1 fzeoli  staff     365 Jul 30 15:31 package.json
drwxr-xr-x    3 fzeoli  staff      96 Jul 30 15:27 scripts
drwxr-xr-x    3 fzeoli  staff      96 Jul 30 15:27 test
```

Inside `scripts/` you will find `sample-script.js`. Add the highlighted lines to it:

```js{1-2,5}
const bre = require("@nomiclabs/buidler");
const ethers = bre.ethers;

async function main() {
  await bre.run("compile");

  // We get the contract to deploy
  const Greeter = await ethers.getContractFactory("Greeter");
  const greeter = await Greeter.deploy("Hello, Buidler!");

  await greeter.deployed();

  console.log("Greeter deployed to:", greeter.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

```

And there you can see how the [Buidler Runtime Environment] is accessed at the top, which makes this script work in a standalone fashion:

```
$ node scripts/sample-script.js
All contracts have already been compiled, skipping compilation.
Greeter address: 0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F
```

But the script can also run through Buidler:

```
$ npx buidler run scripts/sample-script.js 
All contracts have already been compiled, skipping compilation.
All contracts have already been compiled, skipping compilation.
Greeter address: 0x7c2C195CD6D34B8F845992d380aADB2730bB9C6F
```

::: tip
Did you notice the double compile message? When running a script through `npx buidler run`, the `compile` task will be called before running the script, but you can skip this with the `--no-compile` parameter.
:::

### Buidler arguments

You can still pass arguments to Buidler when using it as a library. This is done
by setting environment variables. These are: 

* `BUIDLER_NETWORK`: Sets the network to connect to.

* `BUIDLER_SHOW_STACK_TRACES`: Enables JavaScript stack traces of expected errors.

* `BUIDLER_VERBOSE`: Enables Buidler verbose logging.

* `BUIDLER_MAX_MEMORY`: Sets the maximum amount of memory that Buidler can use.

   

[Buidler Runtime Environment]: ../advanced/buidler-runtime-environment.md
[Getting started guide]: ../getting-started/README.md
