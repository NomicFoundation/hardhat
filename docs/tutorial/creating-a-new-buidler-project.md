# 3. Creating a new Buidler project

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

In the same directory where you installed **Buidler** run:

```
npx buidler
```

Select `Create an empty buidler.config.js` with your keyboard and hit enter.


```{15}
$ npx buidler
888               d8b      888 888
888               Y8P      888 888
888                        888 888
88888b.  888  888 888  .d88888 888  .d88b.  888d888
888 "88b 888  888 888 d88" 888 888 d8P  Y8b 888P"
888  888 888  888 888 888  888 888 88888888 888
888 d88P Y88b 888 888 Y88b 888 888 Y8b.     888
88888P"   "Y88888 888  "Y88888 888  "Y8888  888

👷 Welcome to Buidler v1.0.0 👷‍‍

? What do you want to do? …
  Create a sample project
❯ Create an empty buidler.config.js
  Quit
```

When **Buidler** is run, it searches for the closest `buidler.config.js` file starting from the current working directory. This file normally lives in the root of your project and an empty `buidler.config.js` is enough for **Buidler** to work. The entirety of your setup is contained in this file.

## Buidler's architecture

**Buidler** is designed around the concepts of **tasks** and **plugins**. The bulk of **Buidler**'s functionality comes from plugins, which as a developer [you're free to choose](/plugins/) the ones you want to use. 

### Tasks
Every time you're running **Buidler** from the CLI you're running a task. e.g. `npx buidler compile` is running the `compile` task. To see the currently available tasks in your project, run `npx buidler`. Feel free to explore any task by running `npx buidler help [task]`. 

::: tip
You can create your own tasks. Check out the [Creating a task](/guides/create-task.md) guide.
:::

### Plugins
**Buidler** is unopinionated in terms of what tools you end up using, but it does come with some built-in defaults. All of which can be overriden. Most of the time the way to use a given tool is by consuming a plugin that integrates it into **Buidler**.

For this tutorial we are going to use the Ethers.js and Waffle plugins. They'll allow you to interact with Ethereum and to test your contracts. We'll explain how they're used later on. To install them, in your project directory run:

```
npm install --save-dev @nomiclabs/buidler-ethers ethers @nomiclabs/buidler-waffle ethereum-waffle chai
```

Add the highlighted lines to your `buidler.config.js` so that it looks like this:

```js {1,4-6}
usePlugin("@nomiclabs/buidler-waffle");

module.exports = {
  solc: {
    version: "0.6.8"
  }
};
```

We're only invoking `buidler-waffle` here because it depends on `buidler-ethers` so adding both isn't necessary.
