# Buidler 👷‍

Buidler is your new smart contracts development assistant. It provides a ready to use dev environment, which aims to be really easy to extend and interoperable with the whole javascript ecosystem.

⚠️ **This is alpha software software. While you can start using it today, bear in mind that some APIs may change, and you can encounter bugs** ⚠️

## Table of contents

1. [**Installation**](#Installation)
1. [**Creating your project**](#Creating-your-project)
1. [**Testing your contracts**](#Testing-your-contracts)
1. [**Deploying your contracts**](#Deploying-your-contracts)
1. [**Configuration**](#Configuration)
1. [**Using buidler in your own scripts**](#Using-buidler-in-your-own-scripts)
2. [**The buidler environment**](#The-buidler-environment)
1. [**Creating your own tasks**](#Creating-you-own-tasks)
1. [**Migration from Truffle**](#Migration-from-Truffle)
1. [**Contributing**](#Contributing)
1. [**License**](#License)

## Installation

### Requirements

To use buidler you need to have [node 8.x installed](https://nodejs.org/en/download/).

### Local installation (recommended way)

The **recommended way** of using buidler is by installing it locally your project. Why? This way your environment will be reproducible, and you won't have version conflicts with your coworkers. Working alone? Think of your future self as your coworker.

There's just one catch, if you install it this way, you should add `npx` before `buidler` when running it. Trust us, it is worth it.

Are you convinced? First, initialize your `npm` project using `npm init` and following
the instructions. Once ready run:

`npm install --save-dev buidler`

### Global installation

If you are willing to spend hours debugging inconsistent behavior across different projects before discovering you are using different versions, just run:

`npm -g install buidler`

## Creating your a project

Just run `buidler` in your project root and follow the instructions.

![buidler's project creation](http://g.recordit.co/KTRA2u1fWl.gif)

A sample project will be created, with examples on how to write contracts, test and write scripts using them.

All you need to know is that you should place your contracts in `<project-root>/test`, and that you can read the next section to learn how to test them.

## Testing your contracts

By default, you can write your tests using [mocha](https://mochajs.org/) and [chai](http://www.chaijs.com). Just place them in `<project-root>/test` and run them with `buidler test`. While writing the tests, you can count on [the buidler environment](#The-buidler-environment) and `chai`'s `assert` for you.

Don't like depending on global variables or buidler's test runner? Do you want to use your favorite editor's `mocha` integration? Another testing framework? You can write your tests as normal scripts and require buidler's environment as a any other library. Read section [**Using buidler in your own scripts**](#Using-buidler-in-your-own scripts) for more info.

## Deploying your contracts

If you want an easy way to deploy your contracts you can run `buidler deploy` and it will guide you through the whole process.

![buidler's interactive deployment](http://g.recordit.co/WJAS6oMGYy.gif)

If want a non-interactive version, you can [write your own deployment script](#Using-buidler-in-your-own-scripts).

## Configuration

All your configuration should be placed in a `buidler-config.js` file, place at the root of your project. Feel free to add whatever you want to that script, you just need to assign your config to `module.exports`.

### Networks settings

Networks configuration doc is currently lagging behind, but they are compatible with Truffle's. So, for now, you can [consult their documentation](http://truffleframework.com/docs/advanced/configuration#networks) for now.

### Solc version

Buidler lets you choose which version of solc yo use. You only have to add this to your config:

```js
solc: {
  version: "x.x.x"
}
```

### Integrating other tools

Buidler's config file is guaranteed to be run before any task, so you can place any integration in it, like importing `babel-register`.

## Using buidler in your own scripts

You can take advantage of buidler's infrastructure and configuration in your own
scripts.

By running them with `buidler run <path>`, your contracts will be compiled if necessary, and [the buidler environment](#The-buidler-environment) will be set up for you, making all of its properties available as globals.

You can also run them without using `buidler`, you just need to import [the buidler environment](#The-buidler-environment) with `require("buidler")`. If you run them this way, you have to use environment variables to pass arguments to buidler. You just need to replace the `-` with `_` and write them in uppercase.

## The buidler environment

Weather you are writing tests, a script, or creating a new task, buidler will always provide you the same environment, which consists of an object with these properties:

* `config`: An object consisting of all the buidler's configuration.
* `buidlerArguments`: An object with the values of the different arguments that buidler accepts.
* `Web3`: The `web3.js` module.
* `web3`: a `Web3` instance connected to the chosen network.
* `pweb3`: A promisified version of `web3`.
* `run`: Which can be used to execute any of buidler's tasks.
* `artifacts`: an object containing two methods:
  * `artifacts.require("ContractName")` which can be used to obtain already initialized [Truffle's contract abstractions](https://github.com/trufflesuite/truffle-contract).
  * `artifacts.link(ContractAbstraction, ...libraries)` for linking your contracts and libraries.

## Creating your own tasks

You can create your own tasks using a simple DSL. You just need to place your definitions in your `buidler-config.js` file, and it will be automatically available in buidler's CLI (ie: arguments parsing and help messages are taken care of).

The documentation about how to use task definition DSL is not quiet ready yet, but you can use the ones in `src/builtin-tasks/` as examples.

### Overriding built-in tasks

You can override a built-in function. You only need to redefine it, and your
version will be run. While doing so, you can use `runSuper()` to execute the
original version.

Note that most built-in tasks are split in many micro-tasks, so you probably only need to override one of those.

## Migration from Truffle

While buidler doesn't intend to have every feature that truffle has, it aims to be a drop-in replacement for Truffle tests. As long as you are not using Truffle migrations, you can install buidler, rename your truffle config file to `buidler-config.js`, and run `buidler test`.

## Contributing

Contributions are always welcome! Feel free to open any issue or send a pull request.

## License

MIT
