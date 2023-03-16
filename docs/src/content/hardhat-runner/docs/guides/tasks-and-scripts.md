# Writing tasks and scripts

At its core, Hardhat is a task runner that allows you to automate your development workflow. It comes with some built-in tasks, like `compile` and `test`, but you can add your own custom tasks as well.

This guide will show you how to extend Hardhat's functionality using tasks and scripts. It assumes you have initialized a sample project. If you haven't done it, please read [this guide](./project-setup.md) first.

## Writing Hardhat Tasks

Let's write a very simple task that prints the list of available accounts, and explore how it works.

Copy this task definition and paste it into your hardhat config file:

```js
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});
```

Now you should be able to run it:

```
npx hardhat accounts
```

We are using the `task` function to define our new task. Its first argument is the name of the task, and it's what we use in the command line to run it. The second argument is the description of the task, which is printed when you use `npx hardhat help`.

The third argument is an async function that gets executed when you run the task. It receives two arguments:

1. An object with the arguments for the task. We didn't define any yet.
2. The [Hardhat Runtime Environment](../advanced/hardhat-runtime-environment.md) or HRE, which contains all the functionality of Hardhat and its plugins. You can also find all of its properties injected into the `global` namespace during the task execution.

You are free to do anything you want in this function. In this case, we use `ethers.getSigners()` to obtain all the configured accounts and print each of their addresses.

You can add parameters to your tasks, and Hardhat will handle their parsing and validation for you.

You can also override existing tasks, which allows you to change how different parts of Hardhat work.

To learn more about tasks, please read [this guide](../advanced/create-task).

## Writing Hardhat scripts

You can write scripts and run them with Hardhat. They can take advantage of the [Hardhat Runtime Environment](../advanced/hardhat-runtime-environment.md) to access all of Hardhat's functionality, including the task runner.

Here's a script that does the same as our `accounts` task. Create an `accounts.js` file in the `scripts` directory with this content:

```js
async function main() {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

And run it using the built-in `run` task:

```
npx hardhat run scripts/accounts.js
```

Note that we are using `ethers` without importing it. This is possible because everything that is available in the Hardhat Runtime Environment is also globally available in the script.

To learn more about scripts, including how to run them without using Hardhat's CLI, please read [this guide](../advanced/scripts).

## Choosing between tasks and scripts

Choosing between tasks and scripts is up to you. If you are in doubt which one you should use, you may find this useful:

1. If you want to automate a workflow that requires no parameters, a script is probably the best choice.

2. If the workflow you are automating requires some parameters, consider creating a Hardhat task.

3. If you need to access the Hardhat Runtime Environment from another tool which has its own CLI, like [`jest`](https://jestjs.io/) or [`ndb`](https://www.npmjs.com/package/ndb), you should write a script. Make sure to import the Hardhat runtime environment explicitly, so it can be [run with that tool instead of Hardhat's CLI](../advanced/scripts#standalone-scripts:-using-hardhat-as-a-library).

4. If you feel Hardhat's parameter handling is falling short of your needs, you should write a script. Just import the Hardhat runtime environment explicitly, use your own argument parsing logic (e.g. using [`yargs`](https://yargs.js.org/)), and [run it as a standalone Node.js script](../advanced/scripts#standalone-scripts:-using-hardhat-as-a-library).
