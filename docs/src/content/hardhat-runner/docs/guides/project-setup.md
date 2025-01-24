# Setting up a project

:::tip

If you are using Windows, we **strongly recommend** using [WSL 2](https://docs.microsoft.com/en-us/windows/wsl/about) to follow this guide.

:::

Hardhat projects are Node.js projects with the `hardhat` package installed and a `hardhat.config.js` file.

To initialize a Node.js project you can use [npm](https://docs.npmjs.com/cli/v8) or [yarn](https://classic.yarnpkg.com/). We recommend using npm 7 or later:

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

Then you need to install Hardhat:

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

If you run `npx hardhat init` now, you will be shown some options to facilitate project creation:

```
$ npx hardhat init
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
  Create a TypeScript project
  Create a TypeScript project (with Viem)
  Create an empty hardhat.config.js
  Quit
```

If you select _Create an empty hardhat.config.js_, Hardhat will create a `hardhat.config.js` like the following:

```js
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "{RECOMMENDED_SOLC_VERSION}",
};
```

And this is enough to run Hardhat using a default project structure.

### Sample Hardhat project

If you select _Create a JavaScript project_, a simple project creation wizard will ask you some questions. After that, the wizard will create some directories and files and install the necessary dependencies. The most important of these dependencies is the [Hardhat Toolbox](/hardhat-runner/plugins/nomicfoundation-hardhat-toolbox), a plugin that bundles all the things you need to start working with Hardhat.

The initialized project has the following structure:

```
contracts/
ignition/modules/
test/
hardhat.config.js
```

These are the default paths for a Hardhat project.

- `contracts/` is where the source files for your contracts should be.
- `ignition/modules/` is where the Ignition modules that handle contract deployments should be.
- `test/` is where your tests should go.

If you need to change these paths, take a look at the [paths configuration section](../config/index.md#path-configuration).

### Testing

When it comes to testing your contracts, the sample project comes with some useful functionality:

- The built-in [Hardhat Network](/hardhat-network/docs) as the development network to test on, along with the [Hardhat Network Helpers](/hardhat-network-helpers) library to manipulate this network.
- [Mocha](https://mochajs.org/) as the test runner, [Chai](https://chaijs.com/) as the assertion library, and the [Hardhat Chai Matchers](/hardhat-chai-matchers) to extend Chai with contracts-related functionality.
- The [`ethers.js`](https://docs.ethers.org/v6/) library to interact with the network and with contracts.

As well as other useful plugins. You can learn more about this in the [Testing contracts guide](./test-contracts.md).

### External networks

If you need to use an external network, like an Ethereum testnet, mainnet or some other specific node software, you can set it up using the `networks` configuration entries in the exported object in `hardhat.config.js`, which is how Hardhat projects manage settings.

You can make use of the `--network` CLI parameter to quickly change the network.

Take a look at the [networks configuration section](../config/index.md#networks-configuration) to learn more about setting up different networks.

### Plugins and dependencies

Most of Hardhat's functionality comes from plugins, so check out the [plugins section](/hardhat-runner/plugins) for the official list and see if there are any ones of interest to you.

To use a plugin, the first step is always to install it using npm or yarn, followed by requiring it in your config file:

::::tabsgroup{options="TypeScript,JavaScript"}

:::tab{value="TypeScript"}

```ts
import "@nomicfoundation/hardhat-toolbox";

export default {
  solidity: "{RECOMMENDED_SOLC_VERSION}",
};
```

:::

:::tab{value="JavaScript"}

```js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "{RECOMMENDED_SOLC_VERSION}",
};
```

:::

::::

Plugins are **essential** to Hardhat projects, so make sure to check out all the available ones and also build your own!

### Setting up your editor

[Hardhat for Visual Studio Code](/hardhat-vscode) is the official Hardhat extension that adds advanced support for Solidity to VSCode. If you use Visual Studio Code, give it a try!
