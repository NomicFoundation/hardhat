## Configuration

Buidler is exporting a JavaScript object from a `buidler.config.js` file, which, by default, lives in the root of your project.

The entirety of your Builder setup is contained in this file. Feel free to add any ad-hoc configs you may find useful for your project, just make sure to assign them to `module.exports` so they'll be accessible later on through the config object in the [Builder Runtime Environment](/documentation/#buidler-runtime-environment-bre).

An empty `builder.config.js` is enough for builder to work.

### Available config options

The exported config object can have the following entries: `defaultNetwork`, `networks`, `solc`, and `paths`. A complete configuration would look like this:

```js
module.exports = {
  defaultNetwork: "networkName",
  networks: {...},
  solc: {...},
  paths:{...}
}
```

### Networks configuration

The `networks` config field is an optional object where network names map to objects with the following fields:

- `url`: The url of the node. This argument is required for custom networks.
- `chainId`: An optional number, used to validate the network Buidler connects to. If not present, this validation is omitted.
- `from`: The address to use as default sender. If not present the first account of the node is used.
- `gas`: Its value should be `"auto"` or a number. If a number is used, it will be the gas limit used by default in every transaction. If `"auto"` is used, the gas limit will be automatically estimated. Default value: `"auto"`.
- `gasPrice`: Its value should be `"auto"` or a number. This parameter behaves like `gas`. Default value: `"auto"`.
- `gasMultiplier`: A number used to multiply the results of gas estimation to give it some slack due to the uncertainty of the estimation process. Default: `1`.
- `accounts`: This field controls which accounts Buidler uses. It can use the node's accounts (by setting it to `"remote"`), a list of local accounts (by setting it to an array of hex-encoded private keys), or use an HD Wallet (see below). Default value: `"remote"`.

You can customize which network is used by default when running Buidler by setting the config's `defaultNetwork` field. If you omit this config, its default value will be `"develop"`.

### HD Wallet config

To use an HD Wallet with Buidler you should set your network's `accounts` field to an object with the following fields:

- `mnemonic`: A required string with the mnemonic of the wallet.
- `path`: The HD parent of all the derived keys. Default value: `"m/44'/60'/0'/0"`.
- `initialIndex`: The initial index to derive. Default value: `0`.
- `count`: The number of accounts to derive. Default value: `10`.

### Default networks object

```js
develop: {
  url: "http://127.0.0.1:8545";
}
```

### Solc configuration

The `solc` config field is an optional object which can contain the following keys:

- `version`: The solc version to use. We recommend always setting this field. Default value: `"0.5.8"`.
- `optimizer`: An object with `enabled` and `runs` keys. Default value: `{ enabled: false, runs: 200 }`.
- `evmVersion`: A string controlling the target evm version. One of `"homestead"`, `"tangerineWhistle"`, `"spuriousDragon"`, `"byzantium"`, `"constantinople"`, and `"petersburg"`. Default value: managed by Solidity. Please, consult its documentation.

### Path configuration

You can customize the different paths that buidler uses by providing an object with the following keys:

- `root`: The root of the Buidler project. This path is resolved from the `buidler.config.js`'s directory. Default value: '.'.
- `sources`: The directory where your contract are stored. This path is resolved from the project's root. Default value: './contracts'.
- `tests`: The directory where your tests are located. This path is resolved from the project's root. Default value: './test'.

- `cache`: The directory used by Buidler to cache its internal stuff. This path is resolved from the project's root. Default value: './cache'.
- `artifacts`: The directory where the compilation artifacts are stored. This path is resolved from the project's root. Default value: './artifacts'.

## Quickly integrating other tools

Buidler's config file will always run before any task, so you can use it to integrate with other tools, like importing `@babel/register`.

## Buidler Runtime Environment (BRE)

### Overview
The Buidler Runtime Environment, or BRE for short, is an object containing all the functionality that Buidler exposes when running a task, test or script. In reality, Buidler _is_ the BRE. 

When you require Buidler (`const buidler = require("@nomiclabs/buidler")`) you're getting an instance of the BRE. 

During initialization, the Buidler configuration file essentially constructs a list of things to be added to the BRE. This includes tasks, configs and plugins. Then when tasks, tests or scripts run, the BRE is always present and available to access anything that is contained in it.

The BRE has a role of centralizing coordination across all Buidler components. This architecture allows for plugins to inject functionality that becomes available everywhere the BRE is accessible.

### Using the BRE
By default, the BRE gives you programmatic access to the task runner and the config system, and exports an [EIP1193-compatible](https://eips.ethereum.org/EIPS/eip-1193) Ethereum provider. You can find more information about [it in its API docs](/api/classes/environment.html).

Plugins can extend the BRE. For example, [buidler-web3](https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3) adds a `web3` instance to it, making it available to tasks, tests and scripts.

### Exporting globally

Before running a task, test or script, Buidler injects the BRE into the global scope, turning all of its fields into global variables. When the task execution is completed, these global variables are removed, restoring their original value, if they had one.

### Explicit usage

Not everyone likes magic global variables, and Buidler doesn't force you to use them. Everything can be done explicitly in tasks, tests and scripts.

You can import the config DSL explicitly when defining your tasks, and receive the BRE explicitly as an argument to your actions. You can read more about this in [Creating your own tasks](#creating-your-own-tasks).

When writing tests or scripts, you can use `require("@nomiclabs/buidler")` to import the BRE. You can read more about this in [Accessing the BRE from outside a task](/documentation/#accessing-from-outside-a-task).

### Extending

The BRE only provides the core functionality that users and plugin developers need to start building on top of Buidler. Using it to interface directly with Ethereum in your project can be somewhat harder than expected.

Everything gets easier when you use higher-level libraries, like [web3.js](https://web3js.readthedocs.io/en/latest/) or [truffle-contract](https://github.com/trufflesuite/truffle-contract), but these libraries need some initialization to work, and that could get repetitive.

Buidler lets you hook into the BRE construction, and extend it with new functionality. This way, you only have to initialize everything once, and your new features or libraries will be available everywhere the BRE is used.

You can do this by adding a BRE extender into a queue. This extender is just a synchronous function that receives the BRE, and adds fields to it with your new functionality. These new fields will also get [injected into the global scope during runtime](#exporting-globally).

For example, adding an instance of Web3.js to the BRE can be done in this way:

```js
extendEnvironment(env => {
  env.Web3 = require("web3");

  // env.network.provider is the EIP1193-compatible provider.
  env.web3 = new env.Web3(new Web3HTTPProviderAdapter(env.network.provider));
});
```

### Accessing from outside a task

The BRE can be used from any JavaScript or TypeScript file. To do so, you only have to import it with `require("@nomiclabs/buidler")`. You can do this to keep more control over your development workflow, create your own tools, or to use Buidler with other dev tools from the node.js ecosystem.

Running test directly with [mocha](https://www.npmjs.com/package/mocha) instead of `npx buidler test` can be done by explicitly importing the BRE in them like this:

```js
const env = require("@nomiclabs/buidler");
const assert = require("assert");

describe("Buidler Runtime Environment", function() {
  it("should have a config field", function() {
    assert.notEqual(env.config, undefined);
  });
});
```

This way, tests written for Buidler are just normal mocha tests. This enables you to run them from your favorite editor without the need of any Buidler-specific plugin. For example, you can run them from Visual Studio Code using [Mocha sidebar](https://marketplace.visualstudio.com/items?itemName=maty.vscode-mocha-sidebar).

## Building plugins
This is based on the [TypeScript plugin boilerplate project](https://github.com/nomiclabs/buidler-ts-plugin-boilerplate/). We highly recommend to develop plugins in TypeScript.

### Plugin functionality

Plugins are bits of reusable configuration. Anything that you can do in a plugin, can also be done in your config file. You can test your ideas in a config file, and move them into a plugin when ready.

The main things that plugins can do are extending the Buidler Runtime Environment, extending the Buidler config, defining new tasks, and overriding existing ones.

#### Extending the BRE

To learn how to successfully extend the [BRE](/documentation/#buidler-runtime-environment-bre) in TypeScript, and to give your users type information about your extension, take a look at [`src/index.ts`](https://github.com/nomiclabs/buidler-ts-plugin-boilerplate/blob/master/src/index.ts) in the boilerplate repo and read the [Extending the BRE](/documentation/#extending) documentation.

Make sure to keep the type extension in your main file, as that convention is used across different plugins.

#### Extending the Buidler config

An example on how to add fields to the Buidler config can be found in [`src/index.ts`](https://github.com/nomiclabs/buidler-ts-plugin-boilerplate/blob/master/src/index.ts).

Note that all config extension's have to be optional.

#### Throwing errors from your plugins

To show better stack traces to your users, please only throw [`BuidlerPluginError`](/api/classes/buidlerpluginerror.html#constructors) errors, which can be found in `@nomiclabs/buidler/plugins`.

#### Optimizing your plugin for better startup time

Keeping startup time short is vital to give a good user experience. To do so, Buidler and its plugins delay any slow import or initialization until the very last moment. To do so, you can use `lazyObject`, and `lazyFunction` from `@nomiclabs/buidler/plugins`.

An example on how to use them is present in [`src/index.ts`](https://github.com/nomiclabs/buidler-ts-plugin-boilerplate/blob/master/src/index.ts).

### Notes on dependencies

Knowing when to use a `dependency` or a `peerDependency` can be tricky. We recommend [these](https://yarnpkg.com/blog/2018/04/18/dependencies-done-right/) [articles](https://lexi-lambda.github.io/blog/2016/08/24/understanding-the-npm-dependency-model/) to learn about their distinctions.

If you are still in doubt, these can be helpful:

- Rule of thumb #1: Buidler MUST be a peer dependency.
- Rule of thumb #2: If your plugin P depends on another plugin P2, P2 should be a peer dependency of P, and P2's peer dependencies should be peer dependencies of P.
- Rule of thumb #3: If you have a non-Buidler dependency that your users may `require()`, it should be a peer dependency.
- Rule of thumb #4: Every `peerDependency` should also be a `devDependency`.

Also, if you depend on a Buidler plugin written in TypeScript, you should add it's main `.d.ts` to the `include` array of `tsconfig.json`.

### Hooking into the user's workflow

To integrate into your users' existing workflow, we recommend plugin authors to override built-in tasks whenever it makes sense.

Examples of suggested overrides are:

- Preprocessing smart contracts should override one of the `compile` internal tasks.
- Linter integrations should override the `check` task.
- Plugins generating intermediate files should override the `clean` task.

For a list of all the built-in tasks and internal tasks please take a look at [`task-names.ts`](https://github.com/nomiclabs/buidler/blob/master/packages/buidler-core/src/builtin-tasks/task-names.ts)


## Stack traces

## Verbose logging

Buidler uses the [debug](https://github.com/visionmedia/debug) package to manage logging. A `DEBUG` environment variable that can be used to turn on the verbose logging and filter it using a simple wildcard pattern.

```
$ DEBUG=buidler:* npx buidler
  buidler:core:plugins Loading plugin file /Users/fzeoli/Work/nomic/Buidler/repos/moloch/node_modules/@nomiclabs/buidler/internal/core/tasks/builtin-tasks +0ms
  buidler:core:plugins Loading plugin file /Users/fzeoli/Work/nomic/Buidler/repos/moloch/node_modules/@nomiclabs/buidler/builtin-tasks/clean +2ms
  buidler:core:plugins Loading plugin file /Users/fzeoli/Work/nomic/Buidler/repos/moloch/node_modules/@nomiclabs/buidler/builtin-tasks/compile +1ms
  buidler:core:plugins Loading plugin file /Users/fzeoli/Work/nomic/Buidler/repos/moloch/node_modules/@nomiclabs/buidler/builtin-tasks/console +24ms
  buidler:core:plugins Loading plugin file /Users/fzeoli/Work/nomic/Buidler/repos/moloch/node_modules/@nomiclabs/buidler/builtin-tasks/flatten +2ms
  buidler:core:plugins Loading plugin file /Users/fzeoli/Work/nomic/Buidler/repos/moloch/node_modules/@nomiclabs/buidler/builtin-tasks/help +0ms
  buidler:core:plugins Loading plugin file /Users/fzeoli/Work/nomic/Buidler/repos/moloch/node_modules/@nomiclabs/buidler/builtin-tasks/run +2ms
  buidler:core:plugins Loading plugin file /Users/fzeoli/Work/nomic/Buidler/repos/moloch/node_modules/@nomiclabs/buidler/builtin-tasks/test +0ms
  buidler:core:plugins Loading plugin @nomiclabs/buidler-truffle5 +2ms
  buidler:core:plugins Loading plugin file /Users/fzeoli/Work/nomic/Buidler/repos/moloch/node_modules/@nomiclabs/buidler-truffle5/dist/index.js +2ms
  buidler:core:plugins Loading plugin @nomiclabs/buidler-web3 +2ms
  buidler:core:plugins Loading plugin file /Users/fzeoli/Work/nomic/Buidler/repos/moloch/node_modules/@nomiclabs/buidler-web3/dist/index.js +0ms
  buidler:core:analytics Computing Project Id for /Users/fzeoli/Work/nomic/Buidler/repos/moloch +0ms
  buidler:core:analytics Project Id set to f2d71cba31a116a384d21dcb0e2490a77e82fdbba0c7b3d6a1a9028c6aa66024 +1ms
  buidler:core:analytics Looking up Client Id at /Users/fzeoli/.buidler/config.json +0ms
  buidler:core:analytics Client Id found: 7073d89f-166b-4c60-a382-6ec7630856b2 +1ms
  buidler:core:analytics Sending hit for /task/help +1ms
  buidler:core:analytics Hit payload: {"v":"1","t":"pageview","tid":"UA-117668706-3","cid":"7073d89f-166b-4c60-a382-6ec7630856b2","dp":"/task/help","dh":"cli$
buidler.dev","ua":"Node/v10.16.0 (Macintosh; Intel Mac OS X 10_13_6)","cs":"Developer","cm":"User Type","cd1":"f2d71cba31a116a384d21dcb0e2490a77e82fdbba0c7b3d
6a1a9028c6aa66024","cd2":"Developer","cd3":"Buidler 1.0.0-beta.10"} +1ms
  buidler:core:bre Creating BuidlerRuntimeEnvironment +0ms
  buidler:core:bre Running task help +1ms
Buidler version 1.0.0-beta.10

Usage: buidler [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]

GLOBAL OPTIONS:

  --config              A Buidler config file.
  --emoji               Use emoji in messages.
  --help                Shows this message, or a task's help if its name is provided
  --network             The network to connect to.
  --show-stack-traces   Show stack traces.
  --verbose             Enables Buidler verbose logging
  --version             Shows buidler's version.


AVAILABLE TASKS:

  clean                         Clears the cache and deletes all artifacts
  compile                       Compiles the entire project, building all artifacts
  console                       Opens a buidler console
  flatten                       Flattens and prints all contracts and their dependencies
  help                          Prints this message
  moloch-deploy                 Deploys a new instance of the Moloch DAO
  moloch-process-proposal       Processes a proposal
  moloch-ragequit               Ragequits, burning some shares and getting tokens back
  moloch-submit-proposal        Submits a proposal
  moloch-submit-vote            Submits a vote
  moloch-update-delegate        Updates your delegate
  pool-add-keeper               Adds a keeper
  pool-deploy                   Deploys a new instance of the pool and activates it
  pool-deposit                  Donates tokens to the pool
  pool-keeper-withdraw          Withdraw other users' tokens from the pool
  pool-remove-keeper            Removes a keeper
  pool-sync                     Syncs the pool
  pool-withdraw                 Withdraw tokens from the pool
  run                           Runs a user-defined script after compiling the project
  test                          Runs mocha tests

To get help for a specific task run: buidler help [task]

  buidler:core:analytics Aborting hit for "/task/help" +26ms
  buidler:core:cli Killing Buidler after successfully running task help +0ms
```