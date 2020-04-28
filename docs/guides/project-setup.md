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

👷 Welcome to Buidler v1.0.0 👷‍‍

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

### Sample Buidler project

If you select _Create a sample project_ a simple project creation wizard will ask you some questions and create a project with the following structure:
```
contracts/
scripts/
test/
buidler.config.js
```

These are the default paths for a Buidler project. Except for `scripts/`, which is just a normal directory unrelated to your config. 

- `contracts/` is where the source files for your contracts should be.
- `test/` is where your tests should go.

If you need to change these paths, take a look at the [paths configuration section](../config/README.md#path-configuration).

### Testing and Ethereum networks

When it comes to testing your contracts, Buidler comes with some built-in defaults:
- [Mocha](https://mochajs.org/) as the test runner
- The built-in [Buidler EVM](../buidler-evm/README.md) as the development network to test on

If you need to use an external network, like an Ethereum testnet, mainnet or some other specific node software, you can set it up using the `networks` configuration entries in the exported object in `buidler.config.js`, which is how Buidler projects manage settings. Make use of the `--network` CLI parameter to quickly change the network.

Take a look at the [networks configuration section](../config/README.md#networks-configuration) to learn more about setting up different networks.

### Plugins and dependencies

You may have seen this notice when creating the sample project:

```
You need to install these dependencies to run the sample project:
  npm install --save-dev @nomiclabs/buidler-waffle ethereum-waffle chai @nomiclabs/buidler-ethers ethers
```

This stems from the fact that **most of Buidler's functionality comes from plugins**, so check out the [plugins section](../plugins/README.md) for the official list and see if there are any other ones that look interesting.

The sample project uses the `@nomiclabs/buidler-waffle` plugin, which depends on the `@nomiclabs/buidler-ethers` plugin. These integrate the Ethers.js and Waffle tools into your project. 

To use a plugin, the first step is always to install it using `npm` or `yarn`, and then adding a call to `usePlugin(<npm package name>)` in your config file, like this:

```js
usePlugin("@nomiclabs/buidler-waffle");

module.exports = {};
```

Plugins are **essential** to Buidler projects, so make sure to check out all the available ones and also build your own ones!

For any help or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).


