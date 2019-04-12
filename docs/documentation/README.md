---
prev: false
next: false
sidebar: auto
---
# Documentation

## Overview
Buidler is designed around the concepts of tasks, and the Buidler Runtime Environment, a set of functionality available for tasks. This document describes both concepts in detail.

**You don't need to read this to use Buidler, you can get started with it by reading [this guide](/guides/#getting-started).**

If you want to write your own tasks, create your own plugins, or are just curious about Buidler internals, keep reading.

## Tasks

Buidler helps smart contract developers automate their workflow by letting them run and create tasks. Tasks can call other tasks, allowing complex workflows to be defined. Users and plugins can override existing tasks, making those workflows customizable and extendable.

A task is a JavaScript async function with some associated metadata. This metadata is used by Buidler to automate some things for you. Arguments parsing, validation, and help messages are taken care of.

### Creating your own tasks

You can create your own tasks in your `buidler.config.js` file. The Config DSL will be available in the global environment, with functions for defining tasks. You can also import the DSL with `require("@nomiclabs/buidler/config")` if you prefer to keep things explicit, and take advantage of your editor's autocomplete.

Creating a task is done by calling the [`task` function](/api/#task). It will return a [`TaskDefinition`](/api/interfaces/taskdefinition.html) object, which can be used to define the task's parameters. There are multiple ways of calling `task`, take a look at [its API documentation](/api/#task).

The simplest task you can define is

```js
task(
  "hello", "Prints 'Hello, World!'", 
  async function action(taskArguments, env, runSuper) {  
    console.log('Hello, World!');
  }
);
```

`task`'s first argument is the task name. The second one is its description, which is used for printing help messages in the CLI. The third one, `action`, is an async function that receives the following arguments:

* `taskArguments` is an object with the parsed CLI arguments of the task. In this case, it's an empty object.
* `env` is the [Buidler Runtime Environment](/documentation/#buidler-runtime-environment-bre).
* `runSuper` is only relevant if you are overriding an existing task, which we'll learn about next. Its purpose is to let you run the original task's action.

Defining the action's arguments is optional. The Buidler Runtime Environment and `runSuper` will also be available in the global scope. We can rewrite our "hello" task this way:

```js
task("hello", "Prints 'Hello, World!'", async () => console.log('Hello, World!'));
```

#### Tasks' actions requirements

The only requirement for writing a task is that the `Promise` returned by its action must not resolve before every async process it started is finished.

This is an example of a task whose action doesn't meet this requirement.

```js
task("BAD", "This task is broken", async () => {
  setTimeout(() => {
    throw new Error(
      "This tasks' action returned a promise that resolved before I was thrown"
    );
  }, 1000);
});
```

This other task uses a `Promise` to wait for the timeout to fire.

```js
task("delayed-hello", "Prints 'Hello, World!' after a second", async () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('Hello, World!');
      resolve();
    }, 1000);
  });
});
```

Manually creating a `Promise` can look challenging, but you don't have to do that if you stick to `async`/`await` and `Promise`-based APIs. For example, you can use the npm package [`delay`](https://www.npmjs.com/package/delay) for a promisified version of `setTimeout`.

#### Defining parameters

Buidler tasks can receive `--named` parameters with a value, `--flags`, positional and variadic parameters. Variadic parameters act like JavaScript's rest parameters. The Config DSL `task` function returns an object with methods to define all of them. Once defined, Buidler takes control of parsing parameters, validating them, and printing help messages.

Adding a positional parameter to the `hello` task can look like this:

```js
task("hello", "Prints a greeting'")
   .addOptionalParam("greeting", "The greeting to print", "Hello, World!")
    .setAction(async ({ greeting }) => console.log(greeting));
```

And would be run with `npx buidler hello --greeting Hola`.

You can read the full documentation of these methods and their possible parameters in the [TaskDefinition API doc](api/interfaces/taskdefinition.html#methods).

##### Positional parameters restrictions

Positional and variadic parameters don't have to be named, and have the usual restrictions of a programming language:

* No parameter can follow a variadic one
* Required/mandatory parameters can't follow an optional one.

Failing to follow these restrictions will result in an exception being thrown when loading Buidler.

##### Type validations

Buidler takes care of validating and parsing the values provided for each parameter. You can declare the type of a parameter, and Buidler will get the CLI strings and convert it into your desired type. If this conversion fails, it will print an error message explaining why.

A number of types are available in the Config DSL through a `types` object. This object is injected into the global scope before processing your `buidler.config.js`, but you can also import it explicitly with `const { types } = require("@nomiclabs/buidler/config")` and take advantage of your editor's autocomplete.

An example of a task defining a type for one of its parameters is

```js
task("hello", "Prints 'Hello' multiple times")
   .addOptionalParam("times", "The number of times to print 'Hello'", 1, types.int)
    .setAction(async ({ times }) => {
      for (let i = 0; i < times; i++) {
        console.log("Hello");
      }
    });
```

Calling it with `npx buidler hello --times notanumber` will result in an error.

### Overriding tasks

Defining a task with the same name than an existing one will override it. This is useful to change or extend the behavior of built-in and plugin-provided tasks.

Tasks overriding works very similarly to overriding methods when extending a class. You can set your own action, which can call the previous one. The only restriction when overriding tasks, is that you can't add or remove parameters.

Tasks override order is important since actions can only call the immediately previous definition, using the `runSuper` function.

Overriding built-in tasks is a great way to customize and extend Buidler. To know which tasks to override, take a look at [src/builtin-tasks]().

#### The `runSuper` function

`runSuper` is a function available to override task's actions. It can be received as the third argument of the task or used directly from the global object.

This function works like [JavaScript's `super` keyword](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super), it calls the task's previously defined action.

The `runSuper` function receives a single optional argument: an object with the task arguments. If this argument isn't provided, the same task arguments received by the action calling it will be used.

### Internal tasks

Creating tasks with lots of logic makes it hard to extend or customize them. Making multiple small and focused tasks that call each other is better to allow for extension. If you design your tasks in this way, users that want to change only a small aspect of them can override one of your internal tasks.

For example, the `compile` task is implemented as a pipeline of six tasks. It just calls internal tasks like `compile:get-source-paths`, `compile:get-dependency-graph`, and `compile:build-artifacts`. We recommend prefixing intermediate tasks with their main task and a colon.

To avoid help messages getting cluttered with lots of intermediate tasks, you can define those using the `internalTask` config DSL function. The `internalTask` function works almost exactly like `task`. The only difference is that tasks defined with it won't be included in help messages.

## Buidler Runtime Environment (BRE)

The Buidler Runtime Environment, or BRE for short, is an object containing all the functionality that Buidler exposes when running a task, test and script.

By default, the BRE gives you programmatic access to the task runner and the config system, and exports an [EIP1193-compatible](https://eips.ethereum.org/EIPS/eip-1193) Ethereum provider. You can find more information about [it in its API docs](/api/classes/environment.html).

Plugins can extend the BRE. For example, [buidler-web3](https://github.com/nomiclabs/buidler-web3) adds a `web3` instance to it, making it available to tasks, tests and scripts.

### Exporting globally

Before running a task, test or script, Buidler injects the BRE into the global scope, turning all of its fields into global variables. When the task execution is completed, these global variables are removed, restoring their original value, if they had one.

### Explicit usage

Not everyone likes magic global variables, and Buidler doesn't force you to use them. Everything can be done explicitly in tasks, tests and scripts.

You can import the config DSL explicitly when defining your tasks, and receive the BRE explicitly as an argument to your actions. You can read more about this in [Creating your own tasks]().

When writing tests or scripts, you can use `require("@nomiclabs/buidler")` to import the BRE. You can read more about this in [Accessing the BRE from outside a task](/documentation/#accessing-from-outside-a-task).

### Extending

The BRE only provides the core functionality that users and plugin developers need to start building on top of Buidler. Using it directly in your project can be somewhat harder than expected.

Everything gets easier when you use higher-level libraries, like [web3.js](https://web3js.readthedocs.io/en/latest/) or [truffle-contract](https://github.com/trufflesuite/truffle-contract), but these libraries need some initialization to work, and that could get repetitive.

Buidler lets you hook into the BRE construction, and extend it with new functionality. This way, you only have to initialize everything once, and your new features or libraries will be available everywhere the BRE is used.

You can do this by adding a BRE extender into a queue. This extender is just a synchronous function that receives the BRE, and adds fields to it with your new functionality. These new fields will also get [injected into the global scope during runtime]().

For example, adding an instance of Web3.js to the BRE can be done in this way:

```js
extendEnvironment(env => {
  env.Web3 = require("web3");

  // env.ethereum is the EIP1193-compatible provider.
  env.web3 = new env.Web3(new Web3HTTPProviderAdapter(env.ethereum));
});
```

### Accessing from outside a task

The BRE can be used from any JavaScript or TypeScript file. To do so, you only have to import it with `require("@nomiclabs/buidler")`. You can do this to keep more control over your development workflow, create your own tools, or to use Buidler with other dev tools from the node.js ecosystem.

Running test directly with [mocha]() instead of `npx buidler test` can be done by explicitly importing the BRE in them like this:

```js
const env = require("@nomiclabs/buidler");
const assert = require("assert");

describe("Buidler Runtime Environment", function () {
  it("should have a config field", function () {
    assert.notEqual(env.config, undefined);
  });
});
```

This way, tests written for Buidler are just normal mocha tests. This enables you to run them from your favorite editor without the need of any Buidler-specific plugin. For example, you can run them from Visual Studio Code using [Mocha sidebar](https://marketplace.visualstudio.com/items?itemName=maty.vscode-mocha-sidebar).

## Configuration

Buidler is exporting a JavaScript object from a `buidler.config.js` file, which, by default, lives in the root of your project.

The entirety of your Builder setup is contained in this file. Feel free to add any ad-hoc configs you may find useful for your project, just make sure to assign them to `module.exports` so they'll be accessible later on through the config object in the [Builder Runtime Environment](/documentation/#buidler-runtime-environment-bre).

An empty `builder.config.js` is enough for builder to work.

### Available config options

The exported config object can have the following entries: `networks`, `solc`, and `paths`. A complete configuration would look like this:

```js
module.exports = {
  networks: {...},
  solc: {…},
  paths:{…}
}
```

#### Networks configuration

The `networks` config field is an optional object where network names map to objects with the following optional fields:

- `url`: The url of the node. Default value: `"http://localhost:8545"`.
- `chainId`: An optional number, used to validate the network Buidlers connect to. If not present, this validation is ommited.
- `from`: The address to use as default sender. If not present the first account of the node is used.
- `gas`: Its value should be `"auto"` or a number. If a number is used, it will be the gas limit used by default in every transaction. If `"auto"` is used, the gas limit will be automatically estimated. Default value: `"auto"`.
- `gasPrice`: Its value should be `"auto"` or a number. This parameter behaves like `gas`. Default value: `"auto"`.
- `gasMultiplier`: A number used to multiply the results of gas estimation to give it some slack due to the uncertenty of the estimation process. Default: `1.25`.
- `accounts`: This field controls which accounts Buidler uses. It can use the node's accounts (by setting it to `"remote"`), a list of local accounts (by setting it to an array of hex-encoded private keys), or use an HD Wallet (see below). Default value: `"remote"`.

##### HD Wallet config

To use an HD Wallet with Buidler you should set your network's `accounts` field to an object with the following fields:

- `mnemonic`: A required string with the mnemonic of the wallet.
- `path`: The HD parent of all the derived keys. Default value: `"m/44'/60'/0'/0"`.
- initialIndex: The initial index to derive. Default value: `0`.
- count: The number of accounts to derive. Default value: `10`.

##### Default networks object

```js
develop: {
  url: "http://127.0.0.1:8545";
}
```

##### Solc configuration

The `solc` config field is an optional object which can contain the following keys:

- `version`: The solc version to use. We recommend always setting this field. Default value: `"0.5.3"`.
- `optimizer`: An object with `enabled` and `runs` keys. Default value: `{ enabled: false, runs: 200 }`.
- `evmVersion`: A string controlling the target evm version. One of `"homestead"`, `"tangerineWhistle"`, `"spuriousDragon"`, `"byzantium"`, and `"constantinople"`. Default value: `"byzantium"`.

##### Path configuration

You can customize the different paths that buidler uses by providing an object with the following keys:

- `root`: The root of the Buidler project. This path is resolved from the `buidler.config.js`'s directory. Default value: '.'.
- `sources`: The directory where your contract are stored. This path is resolved from the project's root. Default value: './contracts'.
- `tests`: The directory where your tests are located. This path is resolved from the project's root. Default value: './test'.

- `cache`: The directory used by Buidler to cache its internal stuff. This path is resolved from the project's root. Default value: './cache'.
- `artifacts`: The directory where the compilation artifacts are stored. This path is resolved from the project's root. Default value: './artifacts'.

### Quickly integrating other tools

Buidler's config file will always run before any task, so you can use it to integrate with other tools, like importing `@babel/register`.

## Plugin development best practices

This is based on the [TypeScript plugin boilerplate project](https://github.com/nomiclabs/buidler-ts-plugin-boilerplate/blob/master/src/index.ts). We highly recommend to develop plugins in TypeScript.

### Plugin functionality

Plugins are bits of reusable configuration. Anything that you can do in a plugin, can also be done in your config file. You can test your ideas in a config file, and move them into a plugin when ready.

The main things that plugins can do are extending the Buidler Runtime Environment, extending the Buidler config, defining new tasks, and overriding existing ones.

#### Extending the BRE

To learn how to successfully extend the [BRE](/documentation/#buidler-runtime-environment-bre) in TypeScript, and to give your users type information about your extension, take a look at [`src/index.ts`](https://github.com/nomiclabs/buidler-ts-plugin-boilerplate/blob/master/src/index.ts) in the boilerplate repo and read the [Extending the BRE](/documentation/#extending) documentation.

Make sure to keep the type extension in your main file, as that convention is used across different plugins.

#### Extending the Buidler config

An example on how to add fields to the Buidler config can be found in [`src/index.ts`](https://github.com/nomiclabs/buidler-ts-plugin-boilerplate/blob/master/src/index.ts).

Note that all config extension's have to be optional.

#### Throwing errors from your plugins

To show better stack traces to your users, please only throw [`BuidlerPluginError`](/api/classes/buidlerpluginerror.html#constructors) errors, which can be found in `@nomiclabs/buidler/plugins`.

#### Optimizing your plugin for better startup time

Keeping startup time short is vital to give a good user experience. To do so, Buidler and its plugins delay any slow import or initialization until the very last moment. To do so, you can use `lazyObject`, and `lazyFunction` from `@nomiclabs/buidler/plugins`.

An example on how to use them is present in [`src/index.ts`](https://github.com/nomiclabs/buidler-ts-plugin-boilerplate/blob/master/src/index.ts).

### Notes on dependencies

Knowing when to use a `dependency` or a `peerDependency` can be tricky. We recommend [these](https://yarnpkg.com/blog/2018/04/18/dependencies-done-right/) [articles](https://lexi-lambda.github.io/blog/2016/08/24/understanding-the-npm-dependency-model/) to learn about their distinctions.

If you are still in doubt, these can be helpful:

- Rule of thumb #1: Buidler MUST be a peer dependency.
- Rule of thumb #2: If your plugin P depends on another plugin P2, P2 should be a peer dependency of P, and P2's peer dependencies should be peer dependencies of P.
- Rule of thumb #3: If you have a non-Buidler dependency that your users may `require()`, it should be a peer dependency.

Also, if you depend on a Buidler plugin written in TypeScript, you should add it's main `.d.ts` to the `include` array of `tsconfig.json`.

### Hooking into the user's workflow

To integrate into your users' existing workflow, we recommend plugin authors to override built-in tasks whenever it makes sense. 

Examples of suggested overrides are:
* Preprocessing smart contracts should override one of the `compile` internal tasks.
* Linter integrations should override the `check` task.
* Plugins generating intermediate files should override the `clean` task.

For a list of all the built-in tasks and internal tasks please take a look at [`src/builtin-tasks/task-names.ts`](https://github.com/nomiclabs/buidler/blob/master/src/builtin-tasks/task-names.ts)