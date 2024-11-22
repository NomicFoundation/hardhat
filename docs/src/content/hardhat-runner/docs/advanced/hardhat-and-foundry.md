# Integrating with Foundry

This guide explains how to combine Hardhat and [Foundry](https://book.getfoundry.sh/) in the same project using our [`@nomicfoundation/hardhat-foundry`](/hardhat-runner/plugins/nomicfoundation-hardhat-foundry) plugin.

## Setting up a hybrid project

How to set up a project that combines Hardhat and Foundry depends on whether you have an existing Hardhat project or an existing Foundry project.

### Adding Foundry to a Hardhat project

:::tip

Foundry relies on Git to work properly. Make sure your project is already a Git repository, or type `git init` to initialize one.

:::

If you have an existing Hardhat project and you want to use Foundry in it, you should follow these steps.

First, run `forge --version` to make sure that you have Foundry installed. If you don't, go [here](https://getfoundry.sh/) to get it.

After that, install the [`@nomicfoundation/hardhat-foundry`](/hardhat-runner/plugins/nomicfoundation-hardhat-foundry) plugin:

::::tabsgroup{options="npm 7+,npm 6,yarn,pnpm"}

:::tab{value="npm 7+"}

```
npm install --save-dev @nomicfoundation/hardhat-foundry
```

:::

:::tab{value="npm 6"}

```
npm install --save-dev @nomicfoundation/hardhat-foundry
```

:::

:::tab{value=yarn}

```
yarn add --dev @nomicfoundation/hardhat-foundry
```

:::

:::tab{value=pnpm}

```
pnpm add --save-dev @nomicfoundation/hardhat-foundry
```

::::

and import it in your Hardhat config:

::::tabsgroup{options=TypeScript,JavaScript}

:::tab{value=TypeScript}

```typescript
import "@nomicfoundation/hardhat-foundry";
```

:::

:::tab{value=JavaScript}

```javascript
require("@nomicfoundation/hardhat-foundry");
```

:::

::::

To complete the setup, run `npx hardhat init-foundry`. This task will create a `foundry.toml` file with the right configuration and install [`forge-std`](https://github.com/foundry-rs/forge-std).

### Adding Hardhat to a Foundry project

If you have an existing Foundry project and you want to use Hardhat in it, follow these steps.

First, if you don't have a `package.json` already in your project, create one with `npm init`.

Then install Hardhat, the [Hardhat Toolbox](/hardhat-runner/plugins/nomicfoundation-hardhat-toolbox), and the [`@nomicfoundation/hardhat-foundry`](/hardhat-runner/plugins/nomicfoundation-hardhat-foundry) plugin:

::::tabsgroup{options="npm 7+,npm 6,yarn,pnpm"}

:::tab{value="npm 7+"}

```
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-foundry
```

:::

:::tab{value="npm 6"}

```
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-foundry
```

:::

:::tab{value=yarn}

```
yarn add --dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-foundry
```

:::

:::tab{value=pnpm}

```
pnpm add --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-foundry
```

:::

::::

After that, initialize a Hardhat project with `npx hardhat init`. Choose the "Create an empty hardhat.config.js" option, and then import the plugin in `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-foundry");
```

You should now be able to compile your project with Hardhat and to add Hardhat scripts and tests.

## Working with a combined setup

Once you've set up a project as explained in the previous section, you'll be able to use both Hardhat and Foundry in it. These are some of the things you can do:

- Write some tests [in JavaScript/TypeScript](/hardhat-runner/docs/guides/test-contracts) and run them with `npx hardhat test`
- Write other tests [in Solidity](https://book.getfoundry.sh/forge/writing-tests) and run them with `forge test`
- Compile your contracts with either `npx hardhat compile` or `forge build`
- Write a [custom Hardhat task](/hardhat-runner/docs/advanced/create-task) and execute it

Check [our docs](/hardhat-runner/docs) and [Foundry docs](https://book.getfoundry.sh/) to learn more.
