# 3. Configuring Buidler

In the same folder where you installed **Buidler** run:

```
npx buidler
```

You will see the following output, move down with your keyboard, select `Create an empty buidler.config.js` and hit enter.


```
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

## Tasks
A task is a JavaScript async function with some associated metadata. This metadata is used by **Buidler** to automate some things for you. 

To see the currently available tasks in your project, run `npx buidler`. Feel free to explore any task by running `npx buidler help [task]`. 

[algo como que por ahora no vamos a profundizar en esto? o presentar los tasks de compile y test?]

::: tip
You can create tasks by defining them inside`buidler.config.js`. For some ideas, you could create a task to reset the state of a development environment, interact with your contracts or package your project.
:::

## Plugins
Plugins are built using the same API that you use in your configuration and are useful to extend **Buidler's** functionality.

For this tutorial, we are going to install two plugins (ether.js and Waffle) and some needed libraries. We will explain their functionality later, for now install them by running:

```
npm install --save-dev @nomiclabs/buidler-ethers ethers @nomiclabs/buidler-waffle ethereum-waffle chai
```

Add the following statement to your `buidler.config.js`:

```js {1}
usePlugin("@nomiclabs/buidler-waffle");

// ...

module.exports = {};
```

::: tip
There's no need for `usePlugin("@nomiclabs/buidler-ethers")`, as `buidler-waffle` already does it.
:::


## Setting up Typescript (optional)
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
