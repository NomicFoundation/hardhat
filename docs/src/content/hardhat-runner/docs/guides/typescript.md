# Using TypeScript

In this guide, we will go through the steps to get a Hardhat project working with TypeScript. This means that you can write your Hardhat config, tasks, scripts and tests in [TypeScript](https://www.typescriptlang.org/).

For a general overview of using Hardhat refer to the [Getting started guide](../getting-started/index.md).

## Enabling TypeScript support

Hardhat will automatically enable its TypeScript support if your config file ends in `.ts` and is written in valid TypeScript. This requires a few changes to work properly.

### Installing dependencies

:::tip

If you installed [`@nomicfoundation/hardhat-toolbox`](../../plugins/nomicfoundation-hardhat-toolbox) using npm 7 or higher, you don't need to follow these steps.

:::

Hardhat uses TypeScript and `ts-node` under the hood, so you need to install them. To do it, open your terminal, go to your Hardhat project, and run:

::::tabsgroup{options="npm 7+,npm 6,yarn"}

:::tab{value="npm 7+"}

```
npm install --save-dev ts-node typescript
```

:::

:::tab{value="npm 6"}

```
npm install --save-dev ts-node typescript
```

:::

:::tab{value=yarn}

```
yarn add --dev ts-node typescript
```

:::

::::

To be able to write your tests in TypeScript, you also need these packages:

::::tabsgroup{options="npm 7+,npm 6,yarn"}

:::tab{value="npm 7+"}

```
npm install --save-dev chai@4 @types/node @types/mocha @types/chai@4
```

:::

:::tab{value="npm 6"}

```
npm install --save-dev chai@4 @types/node @types/mocha @types/chai@4
```

:::

:::tab{value=yarn}

```
yarn add --dev chai@4 @types/node @types/mocha @types/chai@4
```

:::

::::

### TypeScript configuration

You can easily turn a JavaScript Hardhat config file into a TypeScript one. Let's see how this is done starting with a fresh Hardhat project.

Open your terminal, go to an empty folder, run `npx hardhat init`, and go through the steps to create a JavaScript project. When you're done your project directory should look something like this:

```
$ ls -l
total 1200
drwxr-xr-x    3 pato  wheel      96 Oct 20 12:50 contracts/
-rw-r--r--    1 pato  wheel     567 Oct 20 12:50 hardhat.config.js
drwxr-xr-x  434 pato  wheel   13888 Oct 20 12:52 node_modules/
-rw-r--r--    1 pato  wheel  604835 Oct 20 12:52 package-lock.json
-rw-r--r--    1 pato  wheel     460 Oct 20 12:52 package.json
drwxr-xr-x    3 pato  wheel      96 Oct 20 12:50 ignition/modules/
drwxr-xr-x    3 pato  wheel      96 Oct 20 12:50 test/
```

Then, you should follow the steps mentioned in the [Installing dependencies](#installing-dependencies) section above.

Now, we are going to rename the config file from `hardhat.config.js` to `hardhat.config.ts`, just run:

```
mv hardhat.config.js hardhat.config.ts
```

We need to make a single change to your config for it to work with TypeScript: you must use `import`/`export` instead of `require`/`module.exports`.

By using TypeScript, you can also type your configuration, which will save you from typos and other mistakes.

For example, the sample project's config turns from this:

<<< @/../packages/hardhat-core/sample-projects/javascript/hardhat.config.js{1,4}

into this:

<<< @/../packages/hardhat-core/sample-projects/typescript/hardhat.config.ts{1,2,4,8}

Finally, you need to create a [`tsconfig.json`](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) file. Here's our recommended one:

<<< @/../packages/hardhat-core/sample-projects/typescript/tsconfig.json

And that's really all it takes. Now you can write your config, tests and tasks in TypeScript.

## Type-checking your project

For performance reasons, Hardhat won't type-check your project when you run a task. You can explicitly enable type-checking with the `--typecheck` flag.

For example, if you run `npx hardhat test` and one of your tests has a compilation error, the test task will be executed anyway. But if you run `npx hardhat test --typecheck`, Hardhat will detect and throw the compilation error before starting to run the tests.

Since type-checking adds significant overhead, we recommend to do it only in your CI or in pre-commit/pre-push hooks.

## Writing tests in TypeScript

When using JavaScript, all the properties in the [Hardhat Runtime Environment](../advanced/hardhat-runtime-environment.md) are injected into the global scope. When using TypeScript nothing will be available in the global scope and you will need to import everything explicitly using, for example, `import { ethers } from "hardhat"`.

Follow the [Getting started guide](../getting-started/index.md) and create a TypeScript project for a complete example on how to write tests using TypeScript.

## Type-safe smart contract interactions

:::tip

If you installed [`@nomicfoundation/hardhat-toolbox`](../../plugins/nomicfoundation-hardhat-toolbox) you can skip this section, as it includes [`@typechain/hardhat`](https://github.com/ethereum-ts/TypeChain/tree/master/packages/hardhat).

:::

If you want Hardhat to generate types for your smart contract you should install and use [`@typechain/hardhat`](https://github.com/ethereum-ts/TypeChain/tree/master/packages/hardhat). It generates typing files (`*.d.ts`) based on ABI's, and it requires little to no configuration.

## Support for path mappings

Typescript allows defining custom [path mappings](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping) via the [`paths`](https://www.typescriptlang.org/tsconfig#paths) configuration option:

```json5
{
  compilerOptions: {
    paths: { "~/*": ["src/*"] },
    // ...Other compilerOptions
  },
}
```

To support this option when running Hardhat tests, you need to install the package [`tsconfig-paths`](https://www.npmjs.com/package/tsconfig-paths) and register it in your `hardhat.config.ts`:

```typescript
import { HardhatUserConfig } from "hardhat/config";

// This adds support for typescript paths mappings
import "tsconfig-paths/register";

const config: HardhatUserConfig = {
  // Your type-safe config goes here
};

export default config;
```

## Running your tests directly with `ts-node`

When running Hardhat tests without the CLI, you need to use `ts-node`'s [`--files` flag](https://www.npmjs.com/package/ts-node#help-my-types-are-missing).

This can also be enabled with `TS_NODE_FILES=true`.

[hardhat runtime environment]: ../advanced/hardhat-runtime-environment.md
