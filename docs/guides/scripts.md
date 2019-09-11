# Standalone scripts

In this guide we will go through the steps of creating a standalone script with Buidler. For a general overview of using Buidler refer to the [Getting started guide](/guides/#getting-started).

The classic use case is writing a deployment script for your smart contracts, and there are two ways of writing a script that accesses the [Buidler Runtime Environment].

## Buidler CLI dependant

The first option injects an instance of the [Buidler Runtime Environment] into the global scope, and then executes the script. These scripts must be run through Buidler: `npx buidler run script.js`. This makes it easy to reuse scripts that were developed for Truffle, which follows this approach. By using the [buidler-truffle5](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-truffle5) the scripts are fully compatible.

## Fully standalone. Buidler as a library.

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
// We require the Buidler Runtime Environment explicitly here. This is optional.
const env = require("@nomiclabs/buidler");

async function main() {
  await env.run("compile");

  const accounts = await env.ethereum.send("eth_accounts");

  console.log("Accounts:", accounts);
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
Accounts: [ '0x494d39079b81c620c0ebea503b9295331bfc34c2',
  '0x125dc724edc761400dfc87eed3709799d8c1a7e2',
  '0x4040a6e01eb8c196cda46921cad8d946c9d21f0b',
  '0x908ec1e984e0eb00771601ea726ad2d859cccb2e',
  '0xd0d23d20fd000ac9330d380b32d64a0ae10441bb',
  '0xc0374e60de5bec55e7da971bb75333fef8f577fb',
  '0x1f670b090d7490a3815b5140936c2e08f597e669',
  '0x655d8651b5494b6635f2bc038a8b2eaf7ccf59fb',
  '0x88523b122e819424ead8cc6007869186bf21f234',
  '0xf6eb3c71526fc84a41479a88af4ff5b15f0ba4f7' ]
```

But the script can also run through Buidler, Truffle-style:
```
$ npx buidler run scripts/sample-script.js
All contracts have already been compiled, skipping compilation.
Accounts: [ '0x494d39079b81c620c0ebea503b9295331bfc34c2',
  '0x125dc724edc761400dfc87eed3709799d8c1a7e2',
  '0x4040a6e01eb8c196cda46921cad8d946c9d21f0b',
  '0x908ec1e984e0eb00771601ea726ad2d859cccb2e',
  '0xd0d23d20fd000ac9330d380b32d64a0ae10441bb',
  '0xc0374e60de5bec55e7da971bb75333fef8f577fb',
  '0x1f670b090d7490a3815b5140936c2e08f597e669',
  '0x655d8651b5494b6635f2bc038a8b2eaf7ccf59fb',
  '0x88523b122e819424ead8cc6007869186bf21f234',
  '0xf6eb3c71526fc84a41479a88af4ff5b15f0ba4f7' ]
```


[Buidler Runtime Environment]: /documentation/#buidler-runtime-environment-bre