# Running tests on Visual Studio Code

You can run your tests from [Visual Studio Code](https://code.visualstudio.com)
by using one of its Mocha integration extensions. We recommend using [Mocha Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-mocha-test-adapter).

To use [Mocha Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-mocha-test-adapter), just
install it and create a file named `.mocharc.json` in your project's root directory with the following contents:

```json
{
  "require": ["@nomiclabs/buidler/register"],
  "timeout": 20000,
  "recursive": "test"
}
```

Finally, make sure you have the latest version of Mocha by running:

```sh
node install --save-dev mocha
```

Now, you can set a shortcut for this VS Code command `test-explorer.run-test-at-cursor`, and you
will be to run the test you are currently editing with it.

For any help or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).
