# Buidler 👷‍♀️

Buidler is a new smart contracts development tool that aims to be lean and flexible. It provides a ready to use dev environment which is easy to extend and interoperable with the whole javascript ecosystem. Read [our announcement](https://medium.com/nomic-labs-blog/towards-a-mature-ecosystem-of-ethereum-developer-tools-bdff10e6cdc3) to know more about our vision for Buidler.

⚠️ **Buidler is alpha software. Sign up to [our newsletter](https://buidler.substack.com/welcome) and we will let you know when a stable release is out.** ⚠️

⚠️ **This branch contains to the upcoming version of Buidler, which is under heavy development. For the npm-published version go to [this commit](https://github.com/nomiclabs/buidler/tree/412404c496ac196a6f467f84849d9536dc60ef86).** ⚠️

## Table of contents

1. [**Creating your project**](#creating-your-project)
1. [**Testing your contracts**](#testing-your-contracts)
1. [**Deploying your contracts**](#deploying-your-contracts)
1. [**Configuration**](#configuration)
1. [**Using buidler in your own scripts**](#using-buidler-in-your-own-scripts)
1. [**The buidler environment**](#the-buidler-environment)
1. [**Creating your own tasks**](#creating-your-own-tasks)
1. [**Migrating from Truffle**](#migrating-from-truffle)
1. [**Installation**](#installation)
1. [**Contributing**](#contributing)
1. [**Feedback and help**](#feedback-and-help)
1. [**Newsletter**](#newsletter)
1. [**License**](#license)

## Creating your project

Just run `buidler` in your project root and follow the instructions.

![buidler's project creation](https://raw.githubusercontent.com/nomiclabs/buidler/master/imgs/project-creation.gif)

A sample project will be created with examples on how to write contracts, tests and any scripts your project may need.

All you need to know is that your contracts go in `<project-root>/contracts`.

## Testing your contracts

Buidler lets you test your project in any way you want. Replacing the test runner, using a different testing framework or running from an editor integration are all allowed, and super easy.

By default, you can write your tests using [mocha](https://mochajs.org/) and [chai](http://www.chaijs.com). Just put them in `<project-root>/test` and run them with `buidler test`. [The buidler environment](#the-buidler-environment) and `chai`'s `assert` will be available in the global scope.

You can write your tests as normal scripts by requiring buidler's environment as any other library. Read section [**Using buidler in your own scripts**](#using-buidler-in-your-own-scripts) for more info.

## Deploying your contracts

`buidler deploy` will guide you through an interactive process to deploy your contracts in an easy way.

![buidler's interactive deployment](https://raw.githubusercontent.com/nomiclabs/buidler/master/imgs/interactive-deployment.gif)

If you prefer a non-interactive deployment process, you can [write your own deployment script](#using-buidler-in-your-own-scripts).

## Configuration

`buidler-config.js` in the root of your project is the main config file. Feel free to add whatever you want in there, just make sure to assign your config to `module.exports` so it's accessible later on.

### Networks settings

Networks configuration is fully compatible with Truffle's, with one small but useful difference: buidler will estimate deployment gas cost for you. There's no need for you to specify it. Take a look [here](http://truffleframework.com/docs/advanced/configuration#networks) to learn how to configure it, or just copy over your existing config.

### Solc version

Buidler lets you choose which version of solc your project uses. In `buidler-config.js`:

```js
module.exports = {
  solc: {
    version: "x.x.x"
  }
}
```

### Integrating other tools

Buidler's config file will **always** run before any task, so you can use it to integrate with other tools, like importing `babel-register`.

## Using buidler in your own scripts

You can leverage buidler's infrastructure and configuration in your own scripts.

By running them with `buidler run <path>` [the buidler environment](#the-buidler-environment) will be initialized, making all of its properties globally available. Your contracts will be compiled before if necessary.

You can also run them without using `buidler`, you just need to import [the buidler environment](#the-buidler-environment) with `require("buidler")`. If you run them this way, you have to use environment variables to pass arguments to buidler (e.g. NETWORK=develop).

## The buidler environment

Whether you are writing tests, a script, or creating a new task, buidler will always provide you with the same environment, which consists of an object with these properties:

* `config`: An object consisting of all the buidler's configuration.
* `buidlerArguments`: An object with the values of the different arguments that buidler accepts.
* `Web3`: The `web3.js` module.
* `web3`: a `Web3` instance connected to the chosen network.
* `pweb3`: A promisified version of `web3`.
* `run`: A function to execute any of buidler's tasks.
* `artifacts`: an object containing two methods:
  * `artifacts.require("ContractName")` which can be used to obtain already initialized [Truffle's contract abstractions](https://github.com/trufflesuite/truffle-contract).
  * `artifacts.link(ContractAbstraction, ...libraries)` for linking your contracts and libraries.

## Creating your own tasks

You can create your own tasks using a simple DSL. You just need to define them in your `buidler-config.js` file, and they will be automatically available through buidler's CLI. Arguments parsing and help messages will be taken care of for you.

![buidler's help message with a custom task](https://raw.githubusercontent.com/nomiclabs/buidler/master/imgs/help.png)

We will write more documentation about how to define tasks soon, but until then you can use the tasks in `src/builtin-tasks/` as a reference.

### Overriding built-in tasks

If you need to take your customization really far, you can even override the built-in tasks. By just redefining any of them, your own version will be run. You can use `runSuper()` within your task to execute the default version.

Note that most built-in tasks are composed of many micro-tasks, so most likely you only need to override one of those.

## Migrating from Truffle

While buidler doesn't intend to provide every feature that truffle has, it aims to be a drop-in replacement for Truffle tests. As long as you are not using Truffle migrations, **just rename your truffle config file to `buidler-config.js`, and run `buidler test`.**

## Installation

### Requirements

To use buidler you need to have [node 8.x installed](https://nodejs.org/en/download/).

### Local installation (recommended)

The **recommended way** of using buidler is through a local installation in your project. This way your environment will be reproducible and you will avoid future version conflicts.

To use it in this way you will need to add `npx` before `buidler` to run it.

To install locally initialize your `npm` project using `npm init` and follow
the instructions. Once ready run:

`npm install --save-dev buidler`

### Global installation

If you are willing to risk hours of your time to debug inconsistent behavior across different projects before discovering you are using different versions, just run:

`npm -g install buidler`

## Contributing

Contributions are always welcome! Feel free to open any issue or send a pull request.

## Feedback and help

If you have any questions or feedback you would like to provide, you can find us in the [Buidler Discord server](https://discord.gg/TufWKfF).

## Newsletter

[Sign up to our newsletter](https://buidler.substack.com/welcome) to hear news about Buidler! We will let you know of new releases, documentation and tutorials.

## License

MIT

## Happy buidling!
👷‍♀️👷‍♂️👷‍♀️👷‍♂️👷‍♀️👷‍♂️👷‍♀️👷‍♂️👷‍♀️👷‍♂️👷‍♀️👷‍♂️👷‍♀️👷‍♂️
