# Writing scripts with Buidler

In this guide we will go through the steps of creating a script with Buidler. For a general overview of using Buidler refer to the [Getting started guide].

You can write your custom scripts that can use all of Buidler's functionality. A classic use case is writing a deployment script for your smart contracts. 

There are two ways of writing a script that accesses the [Buidler Runtime Environment].

## Buidler CLI dependant

You can write scripts that access the [Buidler Runtime Environment]'s properties
as global variables.

These scripts must be run through Buidler: `npx buidler run script.js`. 

This makes it easy to port scripts that were developed for Truffle, which follows this approach,
by using the [buidler-truffle5](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-truffle5). 

## Standalone scripts: using Buidler as a library

The second option leverages Buidler's architecture to allow for more flexibility. Buidler has been designed as a library, allowing you to get creative and build standalone CLI tools that access your development environment. This means that by simply requiring it:

```js
const env = require("@nomiclabs/buidler");
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

Inside `scripts/` you will find `sample-script.js`:
```js
const env = require("@nomiclabs/buidler");

async function main() {
  // You can run Buidler tasks from a script.
  // For example, we make sure everything is compiled by running "compile"
  await env.run("compile");

  // We require the artifacts once our contracts are compiled
  const Greeter = env.artifacts.require("Greeter");
  const greeter = await Greeter.new("Hello, world!");

  console.log("Greeter address:", greeter.address);
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
Greeter address: 0x494d39079b81c620c0ebea503b9295331bfc34c2
```

But the script can also run through Buidler:

```
$ npx buidler run scripts/sample-script.js
All contracts have already been compiled, skipping compilation.
Greeter address: 0x494d39079b81c620c0ebea503b9295331bfc34c2
```

### Buidler arguments

You can still pass arguments to Buidler when using it as a library. This is done
by setting environment variables. These are: 

* `BUIDLER_NETWORK`: Sets the network to connect to.

* `BUIDLER_SHOW_STACK_TRACES`: Enables JavaScript stack traces of expected errors.

* `BUIDLER_VERBOSE`: Enables Buidler verbose logging.

* `BUIDLER_MAX_MEMORY`: Sets the maximum amount of memory that Buidler can use.

   

[Buidler Runtime Environment]: ../advanced/buidler-runtime-environment.md
[Getting started guide]: ../getting-started/README.md
