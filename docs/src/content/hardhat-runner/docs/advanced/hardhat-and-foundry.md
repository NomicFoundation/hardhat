# Integrating with Foundry

This guide explains how to use the [`@nomicfoundation/hardhat-foundry`](/hardhat-runner/plugins/nomicfoundation-hardhat-foundry) plugin to use Hardhat and Foundry in the same project.

When this plugin is installed and enabled, you will be able to compile your project with both Hardhat and Foundry, and to run scripts and tests written in JavaScript/TypeScript or in Solidity.

Keep in mind that you'll still need to use the right tool in each case: use `npx hardhat run` to run a Hardhat script, `npx hardhat test` to run Hardhat tests, `forge script` to run Foundry's Solidity scripts and `forge test` to execute tests written in Solidity.

## Using Foundry in a Hardhat project

If you have an existing Hardhat project and you want to use Foundry in it, you should follow these steps.

First, run `forge --version` to make sure that you have Foundry installed. If you don't, go [here](https://getfoundry.sh/) to get it.

After that, install the [`@nomicfoundation/hardhat-foundry`](/hardhat-runner/plugins/nomicfoundation-hardhat-foundry) plugin:

::::tabsgroup{options="npm 7+,npm 6,yarn"}

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

Finally, run `npx hardhat init-foundry`. This task will create a `foundry.toml` file with the right configuration and it will install [`forge-std`](https://github.com/foundry-rs/forge-std).

## Using Hardhat in a Foundry project

If you have an existing Foundry project and you want to use Hardhat in it, follow these steps.

First, if you don't have a `package.json` already in your project, create one with `npm init`.

Then install Hardhat and the [`@nomicfoundation/hardhat-foundry`](/hardhat-runner/plugins/nomicfoundation-hardhat-foundry) plugin:

::::tabsgroup{options="npm 7+,npm 6,yarn"}

:::tab{value="npm 7+"}

```
npm install --save-dev hardhat @nomicfoundation/hardhat-foundry
```

:::

:::tab{value="npm 6"}

```
npm install --save-dev hardhat @nomicfoundation/hardhat-foundry
```

:::

:::tab{value=yarn}

```
yarn add --dev hardhat @nomicfoundation/hardhat-foundry
```

:::

::::

After that, initialize a Hardhat project with `npx hardhat`. Choose the "Create an empty hardhat.config.js" option, and then import the plugin in `hardhat.config.js`:

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

You should now be able to compile your project with Hardhat and to add Hardhat scripts and tests.
