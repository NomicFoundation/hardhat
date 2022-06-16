# Running tests in Visual Studio Code

:::tip

If you are using Visual Studio Code, try [our extension](/hardhat-vscode), which adds language support for Solidity and provides editor integration for Hardhat projects.

:::

You can run your tests from [Visual Studio Code](https://code.visualstudio.com) by using one of its Mocha integration extensions. We recommend using [Mocha Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-mocha-test-adapter).

To use Mocha Test Explorer, you need to install it and follow these instructions.

Install Mocha locally by running this:

::::tabsgroup{options="npm 7+,npm 6,yarn"}

:::tab{value="npm 7+"}

```
npm install --save-dev mocha
```

:::

:::tab{value="npm 6"}

```
npm install --save-dev mocha
```

:::

:::tab{value=yarn}

```
yarn add --dev mocha
```

:::

::::

Then, you just need to create a file named `.mocharc.json` in your project's root directory with the following contents:

```json
{
  "require": "hardhat/register",
  "timeout": 40000
}
```

:::warning

Running test directly from Visual Studio Code won't compile your contracts automatically. Make sure compile them manually.

:::

## Running TypeScript tests

If you are writing your tests in TypeScript, you should use this `.mocharc.json` instead:

```json
{
  "require": "hardhat/register",
  "timeout": 40000,
  "_": ["test/**/*.ts"]
}
```
