# Writing tasks

At its core, Hardhat is a task runner that allows you to automate your development workflow. It comes with some built-in tasks, like `compile` and `test`, but you can add your own custom tasks as well.

This guide will show you how to extend Hardhat's functionality using tasks. It assumes you have initialized a sample project. If you haven't done it, please read [this guide](./project-setup.md) first.

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
For tasks that support network parameters, you can specify the network like this:


```
npx hardhat compile --network localhost
```
This will run the task on the specified network (in this case, localhost).


We are using the `task` function to define our new task. Its first argument is the name of the task, and it's what we use in the command line to run it. The second argument is the description of the task, which is printed when you use `npx hardhat help`.

The third argument is an async function that gets executed when you run the task. It receives two arguments:

1. An object with the arguments for the task. We didn't define any yet.
2. The [Hardhat Runtime Environment](../advanced/hardhat-runtime-environment.md) or HRE, which contains all the functionality of Hardhat and its plugins. You can also find all of its properties injected into the `global` namespace during the task execution.

You are free to do anything you want in this function. In this case, we use `ethers.getSigners()` to obtain all the configured accounts and print each of their addresses.

You can add parameters to your tasks, and Hardhat will handle their parsing and validation for you.

You can also override existing tasks, which allows you to change how different parts of Hardhat work.

To learn more about tasks, please read [this guide](../advanced/create-task).
