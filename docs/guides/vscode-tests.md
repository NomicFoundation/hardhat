# Running tests on Visual Studio Code

You can run your tests from [Visual Studio Code](https://code.visualstudio.com) by using one of its Mocha integration extensions. We recommend using [Mocha Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-mocha-test-adapter).

To use Mocha Test Explorer, you need to install it and follow these instructions.

Install Mocha locally by running this:

```
npm install --save-dev mocha
```

Then, create a file named `.mocharc.json` in your project's root directory with the following contents:

```json
{
  "require": "hardhat/register",
  "timeout": 20000
}
```

Finally, you can set a shortcut for this VS Code command `test-explorer.run-test-at-cursor`, and you will be able to run the test you are currently editing with it.

## Running TypeScript test

Running tests written in TypeScript from [Visual Studio Code](https://code.visualstudio.com) requires two extra steps.

First, you have to change your `.mocharc.json` to this:

```json{2}
{
  "require": "ts-node/register/files",
  "timeout": 20000
}
```

Then, you have to set the vscode option `"mochaExplorer.files"` to `"test/**/*.{j,t}s"`.

For any help or feedback you may have, you can find us in the [Hardhat Support Discord server](https://hardhat.org/discord). https://hardhat.org/discord
