# 2. Installing Buidler

We'll install **Buidler** using the npm CLI. The **N**ode.js **p**ackage **m**anager is a package manager and an online repository for JavaScript code.

Open a new terminal and run these commands:

```
mkdir buidler-tutorial 
cd buidler-tutorial 
npm init --yes 
npm install --save-dev @nomiclabs/buidler 
```

::: tip
Installing **Buidler** will install some Ethereum JavaScript dependencies, so be patient.
:::

## While you wait: what is Buidler?
**Buidler** is a task runner that facilitates building Ethereum smart contracts. It helps developers manage and automate the recurring tasks that are inherent to the process of building smart contracts, as well as easily introducing more functionality around this workflow. This means compiling and testing at the very core.

**Buidler** is designed around the concepts of **tasks** and **plugins**. Every time you're running **Buidler** from the CLI you're running a task. E.g. `npx buidler compile` is running the `compile` task.

The bulk of **Buidler**'s functionality comes from plugins, which as a developer you're free to choose the ones you want to use. Buidler is unopinionated in terms of what tools you end up using, but it does come with some built-in defaults. All of which can be overriden.

Tasks can call other tasks, allowing complex workflows to be defined. Users and plugins can override existing tasks, making those workflows customizable and extendable.

**Buidler** also comes built-in with **Buidler EVM**, a local Ethereum network designed for development. It allows you to deploy your contracts, run your tests and debug your code. We'll get back to this when we go over testing.


