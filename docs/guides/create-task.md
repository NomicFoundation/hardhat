# Creating a task

This guide will explore the creation of tasks in Buidler, which are the core component used for automation.

A task is a JavaScript async function with some associated metadata. This metadata is used by Buidler to automate some things for you. Arguments parsing, validation, and help messages are taken care of.

Everything you can do in Buidler is defined as a task. The default actions that come out of the box are built-in tasks and they are implemented using the same APIs that are available to you as a user.

To see the currently available tasks in your project, run `npx buidler`:

```
$ npx buidler
Buidler version 1.0.0

Usage: buidler [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]

GLOBAL OPTIONS:

  --config              A Buidler config file.
  --emoji               Use emoji in messages.
  --help                Shows this message.
  --network             The network to connect to. (default: "buidlerevm")
  --show-stack-traces   Show stack traces.
  --version             Shows buidler's version.


AVAILABLE TASKS:

  clean         Clears the cache and deletes all artifacts
  compile       Compiles the entire project, building all artifacts
  console       Opens a buidler console
  flatten       Flattens and prints all contracts and their dependencies
  help          Prints this message
  run           Runs a user-defined script after compiling the project
  test          Runs mocha tests

To get help for a specific task run: buidler help [task]
```

For some ideas, you could create a task to reset the state of a development environment, interact with your contracts or package your project.

Let’s go through the process of creating one to interact with a smart contract.

Tasks in Buidler are asynchronous JavaScript functions that get access to the [Buidler Runtime Environment](../advanced/buidler-runtime-environment.md), through which you get access to the configuration, parameters, programmatic access to other tasks and any objects plugins may have injected.

For our example we will use Web3.js to interact with our contracts, so we will install the [Web3.js plugin](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3), which injects a Web3.js instance into the Buidler environment:

```bash
npm install --save-dev @nomiclabs/buidler-web3 web3
```

_Take a look at the [list of Buidler plugins](../plugins/README.md) to see other available libraries._

Task creation code can go in `buidler.config.js`, or whatever your configuration file is called. It’s a good place to create simple tasks. If your task is more complex, it's also perfectly valid to split the code into several files and `require` from the configuration file.

_If you’re writing a Buidler plugin that adds a task, they can also be created from a separate npm package. Learn more about creating tasks through plugins in our [How to create a plugin guide](./create-plugin.md)._

**The configuration file is always executed on startup before anything else happens.** It's good to keep this in mind. We will load the Web3.js plugin and add our task creation code to it.

For this tutorial, we're going to create a task to get an account’s balance from the terminal. You can do this with the Buidler’s config DSL, which is available in the global scope of `buidler.config.js`:

```js
usePlugin("@nomiclabs/buidler-web3");

task("balance", "Prints an account's balance")
  .setAction(async () => {});

module.exports = {};
```

After saving the file, you should already be able to see the task in Buidler:

```
$ npx buidler
Buidler version 1.0.0

Usage: buidler [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]

GLOBAL OPTIONS:

  --config              A Buidler config file.
  --emoji               Use emoji in messages.
  --help                Shows this message.
  --network             The network to connect to. (default: "buidlerevm")
  --show-stack-traces   Show stack traces.
  --version             Shows buidler's version.


AVAILABLE TASKS:

  balance       Prints an account's balance
  clean         Clears the cache and deletes all artifacts
  compile       Compiles the entire project, building all artifacts
  console       Opens a buidler console
  flatten       Flattens and prints all contracts and their dependencies
  help          Prints this message
  run           Runs a user-defined script after compiling the project
  test          Runs mocha tests

To get help for a specific task run: buidler help [task]
```

Now let’s implement the functionality we want. We need to get the account address from the user. We can do this by adding a parameter to our task:

```js
usePlugin("@nomiclabs/buidler-web3");

task("balance", "Prints an account's balance")
  .addParam("account", "The account's address")
  .setAction(async () => {});

module.exports = {};
```

When you add a parameter to a task, Buidler will handle its help messages for you:

```
$ npx buidler help balance
Buidler version 1.0.0

Usage: buidler [GLOBAL OPTIONS] balance --account <STRING>

OPTIONS:

  --account     The account's address

balance: Prints an account's balance

For global options help run: buidler help
```

Let’s now get the account’s balance. The [Buidler Runtime Environment](../advanced/buidler-runtime-environment.md) will be available in the global scope. By using Buidler’s [Web3.js plugin](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3) we get access to a Web3.js instance:

```js
usePlugin("@nomiclabs/buidler-web3");

task("balance", "Prints an account's balance")
  .addParam("account", "The account's address")
  .setAction(async taskArgs => {
    const account = web3.utils.toChecksumAddress(taskArgs.account);
    const balance = await web3.eth.getBalance(account);

    console.log(web3.utils.fromWei(balance, "ether"), "ETH");
  });

module.exports = {};
```

Finally, we can run it:

```
$ npx buidler balance --account 0x080f632fb4211cfc19d1e795f3f3109f221d44c9
100 ETH
```

And there you have it. Your first fully functional Buidler task, allowing you to interact with the Ethereum blockchain in an easy way.

## Advanced usage

You can create your own tasks in your `buidler.config.js` file. The Config DSL will be available in the global environment, with functions for defining tasks. You can also import the DSL with `require("@nomiclabs/buidler/config")` if you prefer to keep things explicit, and take advantage of your editor's autocomplete.

Creating a task is done by calling the [`task` function](/api/#task). It will return a [`TaskDefinition`](/api/interfaces/taskdefinition.html) object, which can be used to define the task's parameters. There are multiple ways of calling `task`, take a look at [its API documentation](/api/#task).

The simplest task you can define is

```js
task("hello", "Prints 'Hello, World!'", async function(taskArguments, env, runSuper) {
  console.log("Hello, World!");
});
```

`task`'s first argument is the task name. The second one is its description, which is used for printing help messages in the CLI. The third one is an async function that receives the following arguments:

- `taskArguments` is an object with the parsed CLI arguments of the task. In this case, it's an empty object.

- `env` is the [Buidler Runtime Environment](../advanced/buidler-runtime-environment.md).

- `runSuper` is only relevant if you are overriding an existing task, which we'll learn about next. Its purpose is to let you run the original task's action.

Defining the action's arguments is optional. The Buidler Runtime Environment and `runSuper` will also be available in the global scope. We can rewrite our "hello" task this way:

```js
task("hello", "Prints 'Hello, World!'", async () => {
  console.log("Hello, World!");
});
```

### Tasks' actions requirements

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
      console.log("Hello, World!");
      resolve();
    }, 1000);
  });
});
```

Manually creating a `Promise` can look challenging, but you don't have to do that if you stick to `async`/`await` and `Promise`-based APIs. For example, you can use the npm package [`delay`](https://www.npmjs.com/package/delay) for a promisified version of `setTimeout`.

### Defining parameters

Buidler tasks can receive `--named` parameters with a value, `--flags`, positional and variadic parameters. Variadic parameters act like JavaScript's rest parameters. The Config DSL `task` function returns an object with methods to define all of them. Once defined, Buidler takes control of parsing parameters, validating them, and printing help messages.

Adding an optional parameter to the `hello` task can look like this:

```js
task("hello", "Prints a greeting'")
  .addOptionalParam("greeting", "The greeting to print", "Hello, World!")
  .setAction(async ({ greeting }) => console.log(greeting));
```

And would be run with `npx buidler hello --greeting Hola`.

You can read the full documentation of these methods and their possible parameters in the [TaskDefinition API doc](/api/interfaces/taskdefinition.html#methods).

#### Positional parameters restrictions

Positional and variadic parameters don't have to be named, and have the usual restrictions of a programming language:

- No positional parameter can follow a variadic one
- Required/mandatory parameters can't follow an optional one.

Failing to follow these restrictions will result in an exception being thrown when loading Buidler.

#### Type validations

Buidler takes care of validating and parsing the values provided for each parameter. You can declare the type of a parameter, and Buidler will get the CLI strings and convert them into your desired type. If this conversion fails, it will print an error message explaining why.

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

Task overriding works very similarly to overriding methods when extending a class. You can set your own action, which can call the previous one. The only restriction when overriding tasks, is that you can't add or remove parameters.

Task override order is important since actions can only call the immediately previous definition, using the `runSuper` function.

Overriding built-in tasks is a great way to customize and extend Buidler. To know which tasks to override, take a look at [src/builtin-tasks](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-core/src/builtin-tasks).

#### The `runSuper` function

`runSuper` is a function available to override task's actions. It can be received as the third argument of the task or used directly from the global object.

This function works like [JavaScript's `super` keyword](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super), it calls the task's previously defined action.

If the task isn't overriding a previous task definition calling `runSuper` will result in an error. To check if calling it won't fail, you can use the `boolean` field `runSuper.isDefined`.

The `runSuper` function receives a single optional argument: an object with the task arguments. If this argument isn't provided, the same task arguments received by the action calling it will be used.

### Internal tasks

Creating tasks with lots of logic makes it hard to extend or customize them. Making multiple small and focused tasks that call each other is better to allow for extension. If you design your tasks in this way, users that want to change only a small aspect of them can override one of your internal tasks.

For example, the `compile` task is implemented as a pipeline of several tasks. It just calls internal tasks like `compile:get-source-paths`, `compile:get-dependency-graph`, and `compile:build-artifacts`. We recommend prefixing intermediate tasks with their main task and a colon.

To avoid help messages getting cluttered with lots of intermediate tasks, you can define those using the `internalTask` config DSL function. The `internalTask` function works almost exactly like `task`. The only difference is that tasks defined with it won't be included in help messages.

To run an internal task, or any task whatsoever, you can use the `run` function. It takes two arguments: the name of the task to be run, and an object with its arguments.

This is an example of a task running an internal task:

```js
task("hello-world", "Prints a hello world message")
  .setAction(async () => {
    await run("print", {message: "Hello, World!"})
  });

internalTask("print", "Prints a message")
  .addParam("message", "The message to print")
  .setAction(async (taskArgs) => {
    console.log(taskArgs.message)
  });
``` 

For any questions or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).
