# 3. Creating a Buidler project

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

Let's go through the two main concepts before we start using this file.

## Tasks
Every time you're running **Buidler** from the CLI you're running a task. E.g. `npx buidler compile` is running the `compile` task. To see the currently available tasks in your project, run `npx buidler`. Feel free to explore any task by running `npx buidler help [task]`. 

::: tip
You can create your own tasks. Check out the [Creating a task](/guides/create-task.md) guide.
:::

## Plugins
The bulk of **Buidler's** functionality comes from plugins, which as a developer you're free to choose the ones you want to use. **Buidler** is unopinionated in terms of what tools you end up using, but it does come with some built-in defaults. All of which can be overriden.

For this tutorial we are going to use the Ethers.js and Waffle plugins. They'll allow you to interact with Ethereum and to test your contracts. We'll explain how they're used later on. To install them, in your project directory run:

```
npm install --save-dev @nomiclabs/buidler-ethers ethers @nomiclabs/buidler-waffle ethereum-waffle chai
```

Add the highlighted line to your `buidler.config.js` so that it looks like this:

```js {1}
usePlugin("@nomiclabs/buidler-waffle");

module.exports = {};
```

<!---
## Setting up TypeScript (optional)
Skip this section if you want to continue with plain JavaScript and go straight forward to: [4. Creating and compiling contracts.](../4-contracts/)


Install the required Typescript dependencies:

```
npm install --save-dev ts-node typescript @types/node @types/mocha
```

Create a `tsconfig.json` file in the project root:

```js
{
  "compilerOptions": {
    "target": "es5",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist"
  },
  "include": ["./scripts", "./test"],
  "files": [
    "./buidler.config.ts"
  ]
}
```

Rename the config file:

```
mv buidler.config.js buidler.config.ts
```

Open it and make it typesafe with the follwing code:

```js
import { BuidlerConfig, usePlugin } from "@nomiclabs/buidler/config";

usePlugin("@nomiclabs/buidler-waffle");

const config: BuidlerConfig = {};

export default config;
```

Done! You are ready for the next step.
-->