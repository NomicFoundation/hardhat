# Using ES modules

Node.js projects can use one of two module systems: CommonJS and ES Modules (ESM). Hardhat was designed mainly with CommonJS in mind, but in the last years adoption of ESM has been growing.

This guide explains where you can use ESM in your Hardhat project and how to do it.

## Hardhat support for ES modules

You can write your scripts and tests as both CommonJS and ES modules. However, your Hardhat config, and any file imported by it, **must** be CommonJS modules.

If your package uses ESM by default (that is, you have [`"type": "module"`](https://nodejs.org/api/packages.html#type) in your `package.json`), then your Hardhat config file must be named `hardhat.config.cjs`.

Hardhat doesn't support [ESM in TypeScript projects](#esm-and-typescript-projects).

## Using ES Modules in Hardhat

The following sections explain how to use ES modules in new or existing Hardhat projects.

### Starting an ESM-first Hardhat project

If you want to start a Hardhat project that uses ES modules by default, first you have to initialize a Node.js project:

::::tabsgroup{options="npm 7+,npm 6,yarn,pnpm"}

:::tab{value="npm 7+"}

```
npm init -y
```

:::

:::tab{value="npm 6"}

```
npm init -y
```

:::

:::tab{value="yarn"}

```
yarn init -y
```

:::

:::tab{value="pnpm"}

```
pnpm init
```

:::

::::

Open the `package.json` that was created and add a `"type": "module"` entry. This will make the project use ESM by default.

After that, install Hardhat:

::::tabsgroup{options="npm 7+,npm 6,yarn,pnpm"}

:::tab{value="npm 7+"}

```
npm install --save-dev hardhat
```

:::

:::tab{value="npm 6"}

```
npm install --save-dev hardhat
```

:::

:::tab{value="yarn"}

```
yarn add --dev hardhat
```

:::

:::tab{value="pnpm"}

```
pnpm add -D hardhat
```

:::

::::

and run `npx hardhat init` to create a Hardhat project:

```
888    888                      888 888               888
888    888                      888 888               888
888    888                      888 888               888
8888888888  8888b.  888d888 .d88888 88888b.   8888b.  888888
888    888     "88b 888P"  d88" 888 888 "88b     "88b 888
888    888 .d888888 888    888  888 888  888 .d888888 888
888    888 888  888 888    Y88b 888 888  888 888  888 Y88b.
888    888 "Y888888 888     "Y88888 888  888 "Y888888  "Y888

Welcome to Hardhat v{HARDHAT_VERSION}

? What do you want to do? …
▸ Create a JavaScript project
  Create a TypeScript project (not available for ESM projects)
  Create an empty hardhat.config.cjs
  Quit
```

Select the `Create a JavaScript project` option. This will initialize a Hardhat project where the scripts and tests are ES modules, and where the configuration has a `.cjs` extension.

### Migrating a project to ESM

If you have an existing Hardhat project and you want to convert it into an ESM project, follow these steps:

1. Edit your `package.json` and add a `"type": "module"` entry.
2. Rename your `hardhat.config.js` file to `hardhat.config.cjs`.
3. Migrate all your scripts and tests from CommonJS to ESM. Alternatively, you can rename them to have a `.cjs` extension instead of `.js`.

### Adding ESM files to an existing Hardhat project

It's also possible to write ESM scripts and tests without making your whole project ESM by default. To do this, just create your scripts and tests with an `.mjs` extension.

## ESM and TypeScript projects

At the moment, it's not possible to use ESM in TypeScript projects.

Hardhat uses [`ts-node`](https://typestrong.org/ts-node/) to run TypeScript projects, which in turn relies on Node's loader hooks. This is all experimental and the current functionality is not enough for Hardhat's needs.

If you need this feature, please let us know in [this issue](https://github.com/NomicFoundation/hardhat/issues/3385).

## Learn more

To learn more about ES modules in general, check these resources:

- [Node.js docs](https://nodejs.org/api/packages.html)
- [ES modules: A cartoon deep-dive](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/)
- The [Modules chapter](https://exploringjs.com/impatient-js/ch_modules.html) of "JavaScript for impatient programmers"
