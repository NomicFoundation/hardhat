# Creating a task

This guide will explore the creation of tasks in Hardhat, which are the core component used for automation.

A task is a JavaScript async function with some associated metadata. This metadata is used by Hardhat to automate some things for you. Arguments parsing, validation, and help messages are taken care of.

Everything you can do in Hardhat is defined as a task. The default actions that come out of the box are built-in tasks and they are implemented using the same APIs that are available to you as a user.

To see the currently available tasks in your project, run `npx hardhat`:

```
$ npx hardhat
Hardhat version 2.9.10

Usage: hardhat [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]

GLOBAL OPTIONS:

  --config              A Hardhat config file.
  --emoji               Use emoji in messages.
  --help                Shows this message, or a task's help if its name is provided
  --max-memory          The maximum amount of memory that Hardhat can use.
  --network             The network to connect to.
  --show-stack-traces   Show stack traces.
  --tsconfig            A TypeScript config file.
  --verbose             Enables Hardhat verbose logging
  --version             Shows hardhat's version.


AVAILABLE TASKS:

  check         Check whatever you need
  clean         Clears the cache and deletes all artifacts
  compile       Compiles the entire project, building all artifacts
  console       Opens a hardhat console
  flatten       Flattens and prints contracts and their dependencies
  help          Prints this message
  node          Starts a JSON-RPC server on top of Hardhat Network
  run           Runs a user-defined script after compiling the project
  test          Runs mocha tests

To get help for a specific task run: npx hardhat help [task]
```

You can create additional tasks, which will appear in this list. For example, you might create a task to reset the state of a development environment, or to interact with your contracts, or to package your project.

Let’s go through the process of creating one to interact with a smart contract.

Tasks in Hardhat are asynchronous JavaScript functions that get access to the [Hardhat Runtime Environment](../advanced/hardhat-runtime-environment.md), which exposes its configuration and parameters, as well as programmatic access to other tasks and any plugin objects that may have been injected.

For our example, we will use the [`@nomicfoundation/hardhat-toolbox`](/hardhat-runner/plugins/nomicfoundation-hardhat-toolbox), which includes the [ethers.js](https://docs.ethers.org/v6/) library to interact with our contracts.

::::tabsgroup{options="npm 7+,npm 6,yarn,pnpm"}

:::tab{value="npm 7+"}

```
npm install --save-dev @nomicfoundation/hardhat-toolbox
```

:::

:::tab{value="npm 6"}

```
npm install --save-dev @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-network-helpers @nomicfoundation/hardhat-chai-matchers @nomicfoundation/hardhat-ethers @nomicfoundation/hardhat-verify chai@4 ethers hardhat-gas-reporter solidity-coverage @typechain/hardhat typechain @typechain/ethers-v6
```

:::

:::tab{value="yarn"}

```
yarn add --dev @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-network-helpers @nomicfoundation/hardhat-chai-matchers @nomicfoundation/hardhat-ethers @nomicfoundation/hardhat-verify chai@4 ethers hardhat-gas-reporter solidity-coverage @typechain/hardhat typechain @typechain/ethers-v6
```

:::

:::tab{value="pnpm"}

```
pnpm add -D @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-network-helpers chai@4 ethers
```

:::

::::

Task creation code can go in `hardhat.config.js`, or whatever your configuration file is called. It’s a good place to create simple tasks. If your task is more complex, it's also perfectly valid to split the code into several files and `require` them from the configuration file.

(If you’re writing a Hardhat plugin that adds a task, they can also be created from a separate npm package. Learn more about creating tasks through plugins in our [Building plugins section](../advanced/building-plugins.md).)

**The configuration file is always executed on startup before anything else happens.** It's good to keep this in mind. We will load the Hardhat toolbox and add our task creation code to it.

For this tutorial, we're going to create a task to get an account’s balance from the terminal. You can do this with the Hardhat’s config API, which is available in the global scope of `hardhat.config.js`:

```js
require("@nomicfoundation/hardhat-toolbox");

task("balance", "Prints an account's balance").setAction(async () => {});

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "{RECOMMENDED_SOLC_VERSION}",
};
```

After saving the file, you should be able to see the task in Hardhat:

```
$ npx hardhat
Hardhat version 2.9.10

Usage: hardhat [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]

GLOBAL OPTIONS:

  --config           	A Hardhat config file.
  ...


AVAILABLE TASKS:

  balance           	Prints an account's balance
  check             	Check whatever you need
  clean             	Clears the cache and deletes all artifacts
  ...

To get help for a specific task run: npx hardhat help [task]
```

Now let’s implement the functionality we want. We need to get the account address from the user. We can do this by adding a parameter to our task:

```js
task("balance", "Prints an account's balance")
  .addParam("account", "The account's address")
  .setAction(async () => {});
```

When you add a parameter to a task, Hardhat will handle its help messages for you:

```
$ npx hardhat help balance
Hardhat version 2.9.10

Usage: hardhat [GLOBAL OPTIONS] balance --account <STRING>

OPTIONS:

  --account     The account's address

balance: Prints an account's balance

For global options help run: hardhat help
```

Let’s now get the account’s balance. The [Hardhat Runtime Environment](../advanced/hardhat-runtime-environment.md) will be available in the global scope. By using Hardhat’s [ether.js plugin](https://github.com/NomicFoundation/hardhat/tree/main/packages/hardhat-ethers), which is included in the Hardhat Toolbox, we get access to an ethers.js instance:

```js
task("balance", "Prints an account's balance")
  .addParam("account", "The account's address")
  .setAction(async (taskArgs) => {
    const balance = await ethers.provider.getBalance(taskArgs.account);

    console.log(ethers.formatEther(balance), "ETH");
  });
```

Finally, we can run it:

```
$ npx hardhat balance --account 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
10000.0 ETH
```

And there you have it, your first fully functional Hardhat task, allowing you to interact with the Ethereum blockchain in an easy way.

## Advanced usage

You can create your own tasks in your `hardhat.config.js` file. The Config API will be available in the global environment, with functions for defining tasks. You can also import the API with `require("hardhat/config")` if you prefer to keep things explicit, and take advantage of your editor's autocomplete.

Creating a task is done by calling the `task` function. It will return a `TaskDefinition` object, which can be used to define the task's parameters.

The simplest task you can define is

```js
task(
  "hello",
  "Prints 'Hello, World!'",
  async function (taskArguments, hre, runSuper) {
    console.log("Hello, World!");
  }
);
```

`task`'s first argument is the task name. The second one is its description, which is used for printing help messages in the CLI. The third one is an async function that receives the following arguments:

- `taskArguments` is an object with the parsed CLI arguments of the task. In this case, it's an empty object.

- `hre` is the [Hardhat Runtime Environment](../advanced/hardhat-runtime-environment.md).

- `runSuper` is only relevant if you are overriding an existing task, which we'll learn about next. Its purpose is to let you run the original task's action.

Defining the action's arguments is optional. The Hardhat Runtime Environment and `runSuper` will also be available in the global scope. We can rewrite our "hello" task this way:

```js
task("hello", "Prints 'Hello, World!'", async () => {
  console.log("Hello, World!");
});
```

### Tasks' action requirements

The only requirement for writing a task is that the `Promise` returned by its action must not resolve before every async process it started is finished.

This is an example of a task whose action doesn't meet this requirement:

```js
task("BAD", "This task is broken", async () => {
  setTimeout(() => {
    throw new Error(
      "This task's action returned a promise that resolved before I was thrown"
    );
  }, 1000);
});
```

This other task uses a `Promise` to wait for the timeout to fire:

```js
task("delayed-hello", "Prints 'Hello, World!' after a second", async () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log("Hello, World!");
      resolve();
    }, 1000);
  });
});
```

Manually creating a `Promise` can look challenging, but you don't have to do that if you stick to `async`/`await` and `Promise`-based APIs. For example, you can use the npm package [`delay`](https://www.npmjs.com/package/delay) for a promisified version of `setTimeout`.

### Defining parameters

Hardhat tasks can receive named parameters with a value (eg `--parameter-name parameterValue`), flags with no value (eg `--flag-name`), positional parameters, or variadic parameters. Variadic parameters act like JavaScript's rest parameters. The Config API `task` function returns an object with methods to define all of them. Once defined, Hardhat takes control of parsing parameters, validating them, and printing help messages.

Adding an optional parameter to the `hello` task can look like this:

```js
task("hello", "Prints a greeting")
  .addOptionalParam("greeting", "The greeting to print", "Hello, World!")
  .setAction(async ({ greeting }) => console.log(greeting));
```

And would be run with `npx hardhat hello --greeting Hola`.

#### Positional parameters restrictions

Positional and variadic parameters don't have to be named, and have the usual restrictions of a programming language:

- No positional parameter can follow a variadic one
- Required/mandatory parameters can't follow an optional one.

Failing to follow these restrictions will result in an exception being thrown when loading Hardhat.

#### Type validations

Hardhat takes care of validating and parsing the values provided for each parameter. You can declare the type of a parameter, and Hardhat will get the CLI strings and convert them into your desired type. If this conversion fails, it will print an error message explaining why.

A number of types are available in the Config API through a `types` object. This object is injected into the global scope before processing your `hardhat.config.js`, but you can also import it explicitly with `const { types } = require("hardhat/config")` and take advantage of your editor's autocomplete.

An example of a task defining a type for one of its parameters is

```js
task("hello", "Prints 'Hello' multiple times")
  .addOptionalParam(
    "times",
    "The number of times to print 'Hello'",
    1,
    types.int
  )
  .setAction(async ({ times }) => {
    for (let i = 0; i < times; i++) {
      console.log("Hello");
    }
  });
```

Calling it with `npx hardhat hello --times notanumber` will result in an error.

### Overriding tasks

Defining a task with the same name as an existing one will override the existing one. This is useful to change or extend the behavior of built-in and plugin-provided tasks.

Task overriding works very similarly to overriding methods when extending a class. You can set your own action, which can call the overridden one. The only restriction when overriding tasks is that you can't add or remove parameters.

Task override order is important since actions can only call the immediately overridden definition, using the `runSuper` function.

Overriding built-in tasks is a great way to customize and extend Hardhat. To know which tasks to override, take a look at [src/builtin-tasks](https://github.com/NomicFoundation/hardhat/tree/main/packages/hardhat-core/src/builtin-tasks).

#### The `runSuper` function

`runSuper` is a function available to override a task's actions. It can be received as the third argument of the task or used directly from the global object.

This function works like [JavaScript's `super` keyword](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super): it calls the task's previously defined action.

If the task isn't overriding a previous task definition, then calling `runSuper` will result in an error. To check whether calling it would fail, you can use the `boolean` field `runSuper.isDefined`.

The `runSuper` function receives a single optional argument: an object with the task arguments. If this argument isn't provided, the same task arguments received by the action calling it will be used.

### Subtasks

Creating tasks with lots of logic makes it hard to extend or customize them. Making multiple small and focused tasks that call each other is a better way to allow for extension. If you design your tasks in this way, users that want to change only a small aspect of them can override one of your subtasks.

For example, the `compile` task is implemented as a pipeline of several tasks. It just calls subtasks like `compile:get-source-paths`, `compile:get-dependency-graph`, and `compile:build-artifacts`. We recommend prefixing intermediate tasks with their main task and a colon.

To avoid help messages getting cluttered with lots of intermediate tasks, you can define those using the `subtask` config API function. The `subtask` function works almost exactly like `task`. The only difference is that tasks defined with it won't be included in help messages.

To run a subtask, or any task whatsoever, you can use the `run` function. It takes two arguments: the name of the task to be run, and an object with its arguments.

This is an example of a task running a subtask:

```js
task("hello-world", "Prints a hello world message").setAction(
  async (taskArgs, hre) => {
    await hre.run("print", { message: "Hello, World!" });
  }
);

subtask("print", "Prints a message")
  .addParam("message", "The message to print")
  .setAction(async (taskArgs) => {
    console.log(taskArgs.message);
  });
```

### Scoped tasks

You can group tasks under a _scope_. This is useful when you have several tasks that are related to each other in some way.

```js
const myScope = scope("my-scope", "Scope description");

myScope.task("my-task", "Do something")
  .setAction(async () => { ... });

myScope.task("my-other-task", "Do something else")
  .setAction(async () => { ... });
```

In this case, you can run these tasks with `npx hardhat my-scope my-task` and `npx hardhat my-scope my-other-task`.

Scoped tasks can also be run programmatically:

```js
await hre.run({
  scope: "my-scope",
  task: "my-task",
});
```
