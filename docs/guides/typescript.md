# TypeScript Support

In this guide, we will go through the steps to get a Hardhat project working with TypeScript. This means that you can write your Hardhat config, tasks, scripts and tests in [TypeScript](https://www.typescriptlang.org/). For a general overview of using Hardhat refer to the [Getting started guide](../getting-started).

## Installing dependencies

Hardhat detects if `typescript` and `ts-node` are installed in its npm project,
and automatically enables TypeScript support.

To install them, open your terminal, go to your Hardhat project, and run:

```
npm install --save-dev ts-node typescript
```

You also need these packages:

```
npm install --save-dev chai @types/node @types/mocha @types/chai
```

## Configuration

Let's get started with a fresh Hardhat project. Run `npx hardhat` and go through the steps to create a sample project. When you're done your project directory should look like this:

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

Now we are going to rename the config file from `hardhat.config.js` to `hardhat.config.ts`, run:

```
mv hardhat.config.js hardhat.config.ts
```

We also need to adapt it to explicitly import the Hardhat config DSL, and use the [Hardhat Runtime Environment] explicitly.

For example, the sample project's config turns from this
```js{5,13}
usePlugin("@nomiclabs/hardhat-waffle");

// This is a sample Hardhat task. To learn how to create your own go to
// https://usehardhat.com/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});

module.exports = {};
``` 

into this

```typescript{1,7,8,15}
import { task, usePlugin } from "@nomiclabs/hardhat/config";

usePlugin("@nomiclabs/hardhat-waffle");

// This is a sample Hardhat task. To learn how to create your own go to
// https://usehardhat.com/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});

export default {};
```


Next, create a file `tsconfig.json` in your project directory and put the following in it:

```json
{
  "compilerOptions": {
    "target": "es5",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist"
  },
  "include": ["./scripts", "./test"],
  "files": [
    "./hardhat.config.ts"
  ]
}
```

And that's really all it takes. Now the configuration file will be run as TypeScript.

## Type-safe configuration

One of the advantages of using TypeScript, is that you can have an type-safe configuration, and avoid typos and other common errors.

To do that, you have to write your config in TypeScript in this way:

```ts
import { HardhatConfig } from "@nomiclabs/hardhat/config";

const config: HardhatConfig = {
  // Your type-safe config goes here
};

export default config;
```

## Plugin type extensions

Some Hardhat plugins, like [hardhat-waffle](https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-waffle) and [hardhat-ethers](https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-ethers), add new properties to the [Hardhat Runtime Environment]. To keep everything type-safe and make using them with TypeScript possible, they provide type extension files.

For these to be taken into account, you'll need to create a new file called `hardhat-env.d.ts` and write something like this inside (the content will depend on the plugins you are including):

```ts
/// <reference types="@nomiclabs/hardhat-ethers" />
/// <reference types="@nomiclabs/hardhat-waffle" />
```

And then include that file in the `files` entry of your `tsconfig.json`:

```json
"files": [
  "./hardhat.config.ts",
  "./hardhat-env.d.ts",
]
```

Plugins that include type extensions should have documentation detailing their existence.

## Writing tests and scripts

To write your smart contract tests and scripts you'll most likely need access to an Ethereum library to interact with your smart contracts. This will probably be one of [hardhat-ethers](https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-ethers) or [hardhat-web3](https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-web3), all of which inject instances into the [Hardhat Runtime Environment].

When using JavaScript, all the properties in the HRE are injected into the global scope, and are also available by getting the HRE explicitly. When using TypeScript nothing will be available in the global scope and you will need to import everything explicitly.

An example for tests:

```typescript
import { ethers } from "@nomiclabs/hardhat";
import { Signer } from "ethers";

describe("Token", function() {
  let accounts: Signer[];

  beforeEach(async function() {
    accounts = await ethers.getSigners();
  });

  it("should do something right", async function() {
    // Do something with the accounts
  });
});

```

An example for scripts:

```typescript
import { run, ethers } from "@nomiclabs/hardhat";

async function main() {
  await run("compile");

  const accounts = await ethers.getSigners();

  console.log("Accounts:", accounts);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
```

## Performance optimizations

Under the hood, Hardhat uses [ts-node](https://www.npmjs.com/package/ts-node) to support TypeScript. By default, it
will recompile and type-check everything on every run. Depending on your project's size, this can get slow.

You can make Hardhat run faster by preventing `ts-node` from type-checking your project. This is done by setting the
`TS_NODE_TRANSPILE_ONLY` en variable to `1`. For example, you can run your TypeScript-based tests faster like this
`TS_NODE_TRANSPILE_ONLY=1 npx hardhat test`.

## `ts-node` support

When running Hardhat scripts without the CLI, you need to use `ts-node`'s [`--files` flag](https://www.npmjs.com/package/ts-node#help-my-types-are-missing).
This can also be enabled with `TS_NODE_FILES=true`. 

## Limitations

To use Hardhat with TypeScript you need to be able to import Hardhat from your project to access the [Hardhat Runtime Environment], and this wouldn't be possible with a global installation. Because of this Hardhat only supports TypeScript on local installations.

[Hardhat runtime environment]: ../advanced/hardhat-runtime-environment.md
