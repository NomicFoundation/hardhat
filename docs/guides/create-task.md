---
prev: "/guides/"
next: "truffle-migration"
---

# Creating a task

In this guide, we will explore the creation of tasks in Buidler, which are the core component used for automation. For a general overview of using Buidler refer to the [Getting started guide](/guides/#getting-started).

## **What exactly are tasks in Buidler?**

Everything you can do in Buidler is defined as a task. The default actions that come out of the box are built-in tasks and they are implemented using the same APIs that are available to you as a user.

To see the currently available tasks in your project, run `npx buidler`:
```
$ npx buidler
Buidler version 1.0.0-beta.8

Usage: buidler [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]

GLOBAL OPTIONS:

  --config              A Buidler config file.
  --emoji               Use emoji in messages.
  --help                Shows this message.
  --network             The network to connect to. (default: "develop")
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

Tasks in Buidler are asynchronous JavaScript functions that get access to the [Buidler Runtime Environment](/documentation/#buidler-runtime-environment-bre), through which you get access to the configuration, parameters, programmatic access to other tasks and any objects plugins may have injected.

For our example we will use Web3.js to interact with our contracts, so we will install the [web3 plugin](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3), which injects a Web3 instance into the Buidler environment:

```bash
npm install @nomiclabs/buidler-web3 
npm install --save-exact web3@1.0.0-beta.37
```

_Take a look at the [list of Buidler plugins](/plugins) to see other available libraries._

Task creation code can go in `buidler.config.js`, or whatever your configuration file is called. It’s a good place to create simple tasks. If your task is more complex, it's also perfectly valid to split the code into several files and `require` from the configuration file.

_If you’re writing a Buidler plugin that adds a task, they can also be created from a separate npm package. Learn more about creating tasks through plugins in our [How to create a plugin guide](/create-plugin.md)._

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
Buidler version 1.0.0-beta.8

Usage: buidler [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]

GLOBAL OPTIONS:

  --config              A Buidler config file.
  --emoji               Use emoji in messages.
  --help                Shows this message.
  --network             The network to connect to. (default: "develop")
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
Buidler version 1.0.0-beta.8

Usage: buidler [GLOBAL OPTIONS] balance --account <STRING>

OPTIONS:

  --account     The account's address

balance: Prints an account's balance

For global options help run: buidler help
```

Let’s now get the account’s balance. The [Buidler Runtime Environment](/documentation/#buidler-runtime-environment-bre) will be available in the global scope. By using Buidler’s [web3 plugin](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3) we get access to a web3 instance:

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
For more detailed information about creating tasks, refer to the [tasks documentation page](/documentation/#tasks).

For any questions or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).
