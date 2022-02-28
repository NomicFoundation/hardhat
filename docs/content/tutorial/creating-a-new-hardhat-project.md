# 3. Creating a new Hardhat project

We'll install **Hardhat** using the npm CLI. The **N**ode.js **p**ackage **m**anager is a package manager and an online repository for JavaScript code.

Open a new terminal and run these commands:

```
mkdir hardhat-tutorial
cd hardhat-tutorial
npm init --yes
npm install --save-dev hardhat
```

::: tip

Installing **Hardhat** will install some Ethereum JavaScript dependencies, so be patient.

:::

In the same directory where you installed **Hardhat** run:

```
npx hardhat
```

Select `Create an empty hardhat.config.js` with your keyboard and hit enter.

```{15}
$ npx hardhat
888    888                      888 888               888
888    888                      888 888               888
888    888                      888 888               888
8888888888  8888b.  888d888 .d88888 88888b.   8888b.  888888
888    888     "88b 888P"  d88" 888 888 "88b     "88b 888
888    888 .d888888 888    888  888 888  888 .d888888 888
888    888 888  888 888    Y88b 888 888  888 888  888 Y88b.
888    888 "Y888888 888     "Y88888 888  888 "Y888888  "Y888

Welcome to Hardhat v2.0.0

? What do you want to do? …
  Create a sample project
❯ Create an empty hardhat.config.js
  Quit
```

When **Hardhat** is run, it searches for the closest `hardhat.config.js` file starting from the current working directory. This file normally lives in the root of your project and an empty `hardhat.config.js` is enough for **Hardhat** to work. The entirety of your setup is contained in this file.

## Hardhat's architecture

**Hardhat** is designed around the concepts of **tasks** and **plugins**. The bulk of **Hardhat**'s functionality comes from plugins, which as a developer [you're free to choose](/plugins/) the ones you want to use.

### Tasks

Every time you're running **Hardhat** from the CLI you're running a task. e.g. `npx hardhat compile` is running the `compile` task. To see the currently available tasks in your project, run `npx hardhat`. Feel free to explore any task by running `npx hardhat help [task]`.

::: tip

You can create your own tasks. Check out the [Creating a task](/guides/create-task.md) guide.

:::

### Plugins

**Hardhat** is unopinionated in terms of what tools you end up using, but it does come with some built-in defaults. All of which can be overriden. Most of the time the way to use a given tool is by consuming a plugin that integrates it into **Hardhat**.

For this tutorial we are going to use the Ethers.js and Waffle plugins. They'll allow you to interact with Ethereum and to test your contracts. We'll explain how they're used later on. To install them, in your project directory run:

```
npm install --save-dev @nomiclabs/hardhat-ethers ethers @nomiclabs/hardhat-waffle ethereum-waffle chai
```

Add the highlighted line to your `hardhat.config.js` so that it looks like this:

```js {1}
require("@nomiclabs/hardhat-waffle");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.7.3",
};
```

We're only requiring `hardhat-waffle` here because it depends on `hardhat-ethers` so adding both isn't necessary.
