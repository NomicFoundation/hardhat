# Writing tasks and scripts

At its core, Hardhat is a task runner. This means that you can define and run tasks to automate things. Hardhat also comes with some built-in tasks, like `compile` and `test`, but others can be added via plugins or just by defining new tasks in your configuration file.

This guide assumes you have initialized a sample project. If not, check [this guide](./project-setup.md).

### A simple task

Let's write a very simple task that just prints the list of available accounts. Add this to your config:

```js
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});
```

And run the new task:

```
npx hardhat accounts
```

Let's see how this works. We are using the `task` function to define our new task. The first argument is the name of the task and it's what we use in the command line to run it. The second argument is the description of the task, which is printed when you use `npx hardhat help`.

The third argument is the definition of the task itself. It's a function that receives two arguments: the arguments for the task (we don't have any yet) and the [Hardhat Runtime Environment](../advanced/hardhat-runtime-environment.md) (HRE), containing all the functionality of Hardhat and of any enabled plugins. The body of this function is what gets executed when you run the task. Here we are using `ethers.getSigners()` to obtain all the configured accounts and then, for each one, we print its address.

### Running a script with the `run` task

One of the built-in tasks that come with Hardhat is the `run` task. This task receives a file as its argument and runs it within an initialized HRE.

Let's use a script that does the same that our `accounts` task. Create an `accounts.js` file with this content:

```js
async function main() {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

And run it:

```
npx hardhat run accounts.js
```

Notice that we are using `ethers` without importing it or getting it from somewhere else. This is possible because everything that is available in the Hardhat Runtime Environment is also globally available in the script.

### Running a script with node

If you try to run the script directly with node by doing `node accounts.js`, you'll get an error telling you that `ethers` is not available. We can fix this by explicitly requiring Hardhat in the script:

```js{1}
const hre = require("hardhat");

async function main() {
  const accounts = await ethers.getSigners();
```

Run `node accounts.js` again. This time it will work because requiring Hardhat in the script initializes the HRE.

The fact that you are explicitly requiring the HRE doesn't mean that you can't run it with the `run` task. That will still work. You might even prefer to always require Hardhat to avoid using global variables.

### Why use a script

TODO

### Selecting a network

When you are running a task, you can select the network with the `--network` flag. You can try this by starting a node with `npx hardhat node` in a different terminal and then running:

```
npx hardhat accounts --network localhost
```

The same can be done when you run a script because the `--network` flag is available for all tasks:

```
npx hardhat run accounts.js --network localhost
```

But if you are running your script with node, you can't use `--network`. To get the same functionality, you can set the `HARDHAT_NETWORK` environment variable:

```
HARDHAT_NETWORK="localhost" node accounts.js
```

### Adding a parameter to a task

You can add parameters to your task to make their behavior depend on the arguments given in the command line. Let's add one to our `accounts` task:

```js{1,4,8}
const { types } = require("hardhat/config")

task("accounts", "Prints the list of accounts")
  .addParam("count", "Number of accounts to print", 20, types.int)
  .setAction(async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts.slice(0, taskArgs.count)) {
      console.log(account.address);
    }
  });
```

You can test it by doing `npx hardhat accounts --count 3`.

We added the `count` parameter, wrote a description for it and set a default value of `20`. We've also specified it as an integer argument, which means that Hardhat will validate and cast the value automatically. Finally, we use the argument in our code with `taskArgs.count`.

### Passing arguments to a script

When you are running a script with node, you can pass any command line arguments you want and they will be available under the [`process.argv`](https://nodejs.org/docs/latest/api/process.html#processargv) array and use a package like [yargs](http://yargs.js.org/) to parse it. If you are doing this, though, we recommend you to convert your script to a task instead, to leverage the capabilities of the Hardhat Runner.

On the other hand, you can't pass any arguments if you are running your script with the `run` task, because those would be interpreted as arguments for the task itself. If you are facing this situation, we recommend you to convert the script to a task or, if you really need to have a script, to run it with node and parse the raw command line arguments.

### Running a TypeScript script

You can write your script in TypeScript if your Hardhat project is a TypeScript project. For example, this is how an `accounts.ts` script would look like:

```ts{1,4}
import hre from "hardhat";

async function main() {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Notice that we are using `hre.ethers` instead of `ethers`, because for TypeScript files nothing will be globally available, even if you are importing Hardhat.

As before, we can run the script with the `run` task:

```
npx hardhat run accounts.ts
```

### Learn more

Check the [Creating a task](../advanced/create-task.md) guide to learn more about tasks and the [Writing scripts](../advanced/scripts.md) guide to learn more about scripts.
