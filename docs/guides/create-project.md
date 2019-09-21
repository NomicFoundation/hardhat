# Setting up a project

A Buidler project is any directory with a valid `buidler.config.js` file in it. If you run `npx buidler` in a path without one you will be shown two options to facilitate project creation:
```
$ npx buidler
888               d8b      888 888
888               Y8P      888 888
888                        888 888
88888b.  888  888 888  .d88888 888  .d88b.  888d888
888 "88b 888  888 888 d88" 888 888 d8P  Y8b 888P"
888  888 888  888 888 888  888 888 88888888 888
888 d88P Y88b 888 888 Y88b 888 888 Y8b.     888
88888P"   "Y88888 888  "Y88888 888  "Y8888  888

👷 Welcome to Buidler v1.0.0-beta.13 👷‍‍

? What do you want to do? …
❯ Create a sample project
  Create an empty buidler.config.js
  Quit
```

If you select _Create an empty buidler.config.js_, Buidler will create a `buidler.config.js` with the following content:
```js
module.exports = {};
```
And this is enough to run Buidler using a default project structure. 

If you select _Create a sample project_ a simple project creation wizard will ask you some questions and create a project with the following structure:
```
contracts/
scripts/
tests/
buidler.config.js
```

Except for `scripts/`, which is just an organizational directory unrelated to config, these are the default paths for a Buidler project.

- `contracts/` is where the source files for your contracts should be.
- `test/` is where your tests should go.

If you need to change these paths, take a look at the [paths configuration section](/reference/#path-configuration).

By default, Buidler projects use the built-in [Buidler EVM]() as a development network to run tests. If you need to use an external network, like an Ethereum testnet, mainnet or some other specific node software, you can use the `defaultNetwork` and `networks` configuration entries in the exported object in `buidler.config.js`, which is how Buidler projects manages settings.

Take a look at the [networks configuration section](/reference/#networks-configuration) to learn more about setting up different networks.

Most of Buidler's functionality comes from plugins, so the next step in setting up your Buidler project should be choosing the plugins you will be using. Check out the [plugins section](/plugins/) for the official list.

The most commonly used ones are the `buidler-web3` and `buidler-truffle` plugins, which integrate the Web3.js and Truffle projects respectively, facilitating the testing of smart contracts.

To use a plugin, first install it using npm:
```
$ npm install @nomiclabs/buidler-truffle5
```

and add a call to `usePlugin(<npm package name>)` in your config file, like this:

```js
usePlugin("@nomiclabs/buidler-truffle5");

module.exports = {};
```

Plugins are **essential** to Buidler projects, so make sure to check out all the available ones and also build your own ones!

For any help or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).


