# TypeScript Support

In this guide, we will go through the steps to get a Buidler project working with TypeScript. This means that you can write your Hardhat config, tasks, scripts and tests in [TypeScript](https://www.typescriptlang.org/). For a general overview of using Buidler refer to the [Getting started guide](../getting-started).

## Installing dependencies

Buidler detects if `typescript` and `ts-node` are installed in its npm project,
and automatically enables TypeScript support.

To install them, open your terminal, go to your Buidler project, and run:

```
npm install --save-dev ts-node typescript
```

You also need these packages:

```
npm install --save-dev chai @types/node @types/mocha @types/chai
```

## Configuration

Let's get started with a fresh Buidler project. Run `npx buidler` and go through the steps to create a sample project. When you're done your project directory should look like this:

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

We also need to adapt it to explicitly import the Hardhat config DSL, and use the [Buidler Runtime Environment] explicitly.

For example, the sample project's config turns from this
```js{5,13}
usePlugin("@nomiclabs/buidler-waffle");

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
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

usePlugin("@nomiclabs/buidler-waffle");

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
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

Some Buidler plugins, like [buidler-waffle](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-waffle) and [buidler-ethers](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-ethers), add new properties to the [Buidler Runtime Environment]. To keep everything type-safe and make using them with TypeScript possible, they provide type extension files.

For these to be taken into account, you'll need to create a new file called `buidler-env.d.ts` and write something like this inside (the content will depend on the plugins you are including):

```ts
/// <reference types="@nomiclabs/buidler-ethers" />
/// <reference types="@nomiclabs/buidler-waffle" />
```

And then include that file in the `files` entry of your `tsconfig.json`:

```json
"files": [
  "./hardhat.config.ts",
  "./buidler-env.d.ts",
]
```

Plugins that include type extensions should have documentation detailing their existence.

## Writing tests and scripts

To write your smart contract tests and scripts you'll most likely need access to an Ethereum library to interact with your smart contracts. This will probably be one of [buidler-ethers](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-ethers) or [buidler-web3](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3), all of which inject instances into the [Buidler Runtime Environment].

When using JavaScript, all the properties in the HRE are injected into the global scope, and are also available by getting the HRE explicitly. When using TypeScript nothing will be available in the global scope and you will need to import everything explicitly.

An example for tests:

```typescript
import { ethers } from "@nomiclabs/buidler";
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
import { run, ethers } from "@nomiclabs/buidler";

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

Under the hood, Buidler uses [ts-node](https://www.npmjs.com/package/ts-node) to support TypeScript. By default, it
will recompile and type-check everything on every run. Depending on your project's size, this can get slow.

You can make Buidler run faster by preventing `ts-node` from type-checking your project. This is done by setting the
`TS_NODE_TRANSPILE_ONLY` en variable to `1`. For example, you can run your TypeScript-based tests faster like this
`TS_NODE_TRANSPILE_ONLY=1 npx buidler test`.

## `ts-node` support

When running Buidler scripts without the CLI, you need to use `ts-node`'s [`--files` flag](https://www.npmjs.com/package/ts-node#help-my-types-are-missing).
This can also be enabled with `TS_NODE_FILES=true`. 

## Limitations

To use Buidler with TypeScript you need to be able to import Buidler from your project to access the [Buidler Runtime Environment], and this wouldn't be possible with a global installation. Because of this Buidler only supports TypeScript on local installations.

[Buidler runtime environment]: ../advanced/buidler-runtime-environment.md
