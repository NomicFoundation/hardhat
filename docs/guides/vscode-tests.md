# Running tests on Visual Studio Code

To run your tests on Visual Studio Code using Buidler you need to install the [Mocha Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-mocha-test-adapter) extension and create a file named `.mocharc.json` in your project's root directory with the following contents:

```json
{
  "require": ["@nomiclabs/buidler/register"],
  "timeout": 20000,
  "recrusive": "test/**/*.js"
}
```

For any help or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).