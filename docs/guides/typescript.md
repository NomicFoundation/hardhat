# TypeScript Support

In this guide, we will go through the steps to get a Hardhat project working with TypeScript. This means that you can write your Hardhat config, tasks, scripts and tests in [TypeScript](https://www.typescriptlang.org/).

For a general overview of using Hardhat refer to the [Getting started guide](../getting-started).

## Enabling TypeScript support

Hardhat will automatically enable its TypeScript support if your config file ends in `.ts` and is written in valid TypeScript. This requires a few changes to work properly.

### Installing dependencies

Hardhat uses TypeScript and `ts-node` under the hood, so you need to install them. To do it, open your terminal, go to your Hardhat project, and run:

```
npm install --save-dev ts-node typescript
```

To be able to write your tests in TypeScript, you also need these packages:

```
npm install --save-dev chai @types/node @types/mocha @types/chai
```

### TypeScript configuration

You can easily turn a JavaScript Hardhat config file into a TypeScript one. Let's see how this is done starting with a fresh Hardhat project.

Open your terminal, go to an empty folder, run `npx hardhat`, and go through the steps to create a sample project. When you're done your project directory should look something like this:

```
$ ls -l
total 1200
drwxr-xr-x    3 pato  wheel      96 Oct 20 12:50 contracts/
-rw-r--r--    1 pato  wheel     567 Oct 20 12:50 hardhat.config.js
drwxr-xr-x  434 pato  wheel   13888 Oct 20 12:52 node_modules/
-rw-r--r--    1 pato  wheel  604835 Oct 20 12:52 package-lock.json
-rw-r--r--    1 pato  wheel     460 Oct 20 12:52 package.json
drwxr-xr-x    3 pato  wheel      96 Oct 20 12:50 scripts/
drwxr-xr-x    3 pato  wheel      96 Oct 20 12:50 test/
```

Then, you should follow the steps mentioned in the [Installing dependencies](#installing-dependencies) section above.

Now, we are going to rename the config file from `hardhat.config.js` to `hardhat.config.ts`, just run:

```
mv hardhat.config.js hardhat.config.ts
```

We need to apply three changes to your config for it to work with TypeScript:

1. Plugins must be loaded with `import` instead of `require`.
2. You need to explicitly import the Hardhat config functions, like `task`.
3. If you are defining tasks, they need to access the [Hardhat Runtime Environment] explicitly, as a parameter.

For example, the sample project's config turns from this

```js{1,5-6,19-21}
require("@nomiclabs/hardhat-waffle");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.7.3"
};
```

into this

```typescript{1-2,6-7,17-19}
import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

export default {
  solidity: "0.7.3"
};
```

You also need to create a [`tsconfig.json`](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) file. Here's a template you can base yours on:

```json
{
  "compilerOptions": {
    "target": "es2018",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist"
  },
  "include": ["./scripts", "./test"],
  "files": ["./hardhat.config.ts"]
}
```

You can use different settings, but please make sure your Hardhat config file is included. The easiest way of doing this is by keeping its path in the `files` array.

And that's really all it takes. Now you can write your config, tests, tasks and scripts in TypeScript.

## Writing tests and scripts in TypeScript

To write your smart contract tests and scripts you'll most likely need access to an Ethereum library to interact with your smart contracts. This will probably be one of [hardhat-ethers](https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-ethers) or [hardhat-web3](https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-web3), all of which inject instances into the [Hardhat Runtime Environment].

When using JavaScript, all the properties in the HRE are injected into the global scope, and are also available by getting the HRE explicitly. When using TypeScript nothing will be available in the global scope and you will need to import everything explicitly.

An example for tests:

```typescript
import { ethers } from "hardhat";
import { Signer } from "ethers";

describe("Token", function () {
  let accounts: Signer[];

  beforeEach(async function () {
    accounts = await ethers.getSigners();
  });

  it("should do something right", async function () {
    // Do something with the accounts
  });
});
```

An example for scripts:

```typescript
import { run, ethers } from "hardhat";

async function main() {
  await run("compile");

  const accounts = await ethers.getSigners();

  console.log(
    "Accounts:",
    accounts.map((a) => a.address)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

## Type-safe smart contract interactions

If you want to type-check smart contract interactions (calling methods, reading events), use [`@typechain/hardhat`](https://github.com/ethereum-ts/TypeChain/tree/master/packages/hardhat). It generates typing files (`*.d.ts`) based on ABI's, and it requires little to no configuration when used with Hardhat.

## Type-safe configuration

One of the advantages of using TypeScript, is that you can have a type-safe configuration, and avoid typos and other common errors.

To do that, you have to write your config in this way:

```ts
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  // Your type-safe config goes here
};

export default config;
```

## Support for path mappings

Typescript allows defining custom [path mappings](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping) via the [`paths`](https://www.typescriptlang.org/tsconfig#paths) configuration option:

```json5
{
  compilerOptions: {
    paths: { "~/*": ["src/*"] },
    // ...Other compilerOptions
  },
  include: ["./scripts", "./test"],
  files: ["./hardhat.config.ts"],
}
```

To support this option when running Hardhat tests or scripts, you need to install the package [`tsconfig-paths`](https://www.npmjs.com/package/tsconfig-paths) and register it in your `hardhat.config.ts`:

```typescript
import { HardhatUserConfig } from "hardhat/config";

// This adds support for typescript paths mappings
import "tsconfig-paths/register";

const config: HardhatUserConfig = {
  // Your type-safe config goes here
};

export default config;
```

## Performance optimizations

Under the hood, Hardhat uses [ts-node](https://www.npmjs.com/package/ts-node) to support TypeScript. By default, it will recompile and type-check everything on every run. Depending on your project's size, this can get slow.

You can make Hardhat run faster by preventing `ts-node` from type-checking your project. This is done by setting the `TS_NODE_TRANSPILE_ONLY` env variable to `1`.

For example, you can run your TypeScript-based tests faster like this `TS_NODE_TRANSPILE_ONLY=1 npx hardhat test`.

## Running your tests and scripts directly with `ts-node`

When running Hardhat scripts without the CLI, you need to use `ts-node`'s [`--files` flag](https://www.npmjs.com/package/ts-node#help-my-types-are-missing).

This can also be enabled with `TS_NODE_FILES=true`.

[hardhat runtime environment]: ../advanced/hardhat-runtime-environment.md
