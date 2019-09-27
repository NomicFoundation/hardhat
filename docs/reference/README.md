## Configuration

When Buidler is run, it searches for the closest `buidler.config.js` file starting
from the Current Working Directory. This file normally lives in the root of your project. An empty `builder.config.js` is enough for builder to work.

The entirety of your Builder setup (i.e. your config, plugins and custom tasks) is contained in this file.

### Available config options

To set up your config, you have to export an object from `buidler.config.js`.

This object can have the following entries: `defaultNetwork`, `networks`, `solc`, and `paths`. A complete configuration would look like this:

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

#### HD Wallet config

To use an HD Wallet with Buidler you should set your network's `accounts` field to an object with the following fields:

- `mnemonic`: A required string with the mnemonic of the wallet.
- `path`: The HD parent of all the derived keys. Default value: `"m/44'/60'/0'/0"`.
- `initialIndex`: The initial index to derive. Default value: `0`.
- `count`: The number of accounts to derive. Default value: `10`.

#### Default networks object

```js
develop: {
  url: "http://127.0.0.1:8545";
}
```

### Solc configuration

The `solc` config field is an optional object which can contain the following keys:

- `version`: The solc version to use. We recommend always setting this field. Default value: `"0.5.11"`.

- `optimizer`: An object with `enabled` and `runs` keys. Default value: `{ enabled: false, runs: 200 }`.

- `evmVersion`: A string controlling the target evm version. One of `"homestead"`, `"tangerineWhistle"`, `"spuriousDragon"`, `"byzantium"`, `"constantinople"`, `"petersburg"`, `"istanbul""`. Default value: managed by Solidity. Please, consult its documentation.

### Path configuration

You can customize the different paths that Buidler uses by providing an object with the following keys:

- `root`: The root of the Buidler project. This path is resolved from the `buidler.config.js`'s directory. Default value: The directory containing the config file.
- `sources`: The directory where your contract are stored. This path is resolved from the project's root. Default value: './contracts'.
- `tests`: The directory where your tests are located. This path is resolved from the project's root. Default value: './test'.

- `cache`: The directory used by Buidler to cache its internal stuff. This path is resolved from the project's root. Default value: './cache'.
- `artifacts`: The directory where the compilation artifacts are stored. This path is resolved from the project's root. Default value: './artifacts'.

### Quickly integrating other tools from Buidler's config

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

#### As global variables

Before running a task, test or script, Buidler injects the BRE into the global scope, turning all of its fields into global variables. When the task execution is completed, these global variables are removed, restoring their original value, if they had one.

#### Explicitly

Not everyone likes magic global variables, and Buidler doesn't force you to use them. Everything can be done explicitly in tasks, tests and scripts.

When writing tests or scripts, you can use `require("@nomiclabs/buidler")` to import the BRE. You can read more about this in [Accessing the BRE from outside a task](#accessing-the-bre-from-outside-a-task).

You can import the config DSL explicitly when defining your tasks, and receive the BRE explicitly as an argument to your actions. You can read more about this in [Creating your own tasks](#creating-your-own-tasks).

### Extending the BRE

The BRE only provides the core functionality that users and plugin developers need to start building on top of Buidler. Using it to interface directly with Ethereum in your project can be somewhat harder than expected.

Everything gets easier when you use higher-level libraries, like [web3.js](https://web3js.readthedocs.io/en/latest/) or [truffle-contract](https://github.com/trufflesuite/truffle-contract), but these libraries need some initialization to work, and that could get repetitive.

Buidler lets you hook into the BRE construction, and extend it with new functionality. This way, you only have to initialize everything once, and your new features or libraries will be available everywhere the BRE is used.

You can do this by adding a BRE extender into a queue. This extender is just a synchronous function that receives the BRE, and adds fields to it with your new functionality. These new fields will also get [injected into the global scope during runtime](#exporting-globally).

For example, adding an instance of Web3.js to the BRE can be done in this way:

```js
extendEnvironment(env => {
  const Web3 = require("web3");
  env.Web3 = Web3;

  // env.network.provider is an EIP1193-compatible provider.
  env.web3 = new Web3(new Web3HTTPProviderAdapter(env.network.provider));
});
```

### Accessing the BRE from outside a task

The BRE can be used from any JavaScript or TypeScript file. To do so, you only have to import it with `require("@nomiclabs/buidler")`. You can do this to keep more control over your development workflow, create your own tools, or to use Buidler with other dev tools from the node.js ecosystem.

Running test directly with [Mocha](https://www.npmjs.com/package/mocha) instead of `npx buidler test` can be done by explicitly importing the BRE in them like this:

```js
const env = require("@nomiclabs/buidler");
const assert = require("assert");

describe("Buidler Runtime Environment", function() {
  it("should have a config field", function() {
    assert.notEqual(env.config, undefined);
  });
});
```

This way, tests written for Buidler are just normal Mocha tests. This enables you to run them from your favorite editor without the need of any Buidler-specific plugin. For example, you can run them from [Visual Studio Code](https://code.visualstudio.com/) using [Mocha Test Explorer](https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-mocha-test-adapter).

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

## Verbose logging

You can enable Buidler's verbose mode by running it with its `--verbose` flag, or by setting the `BUIDLER_VERBOSE` environment variable to `true`.

This mode will print a lot of output that can be super useful for debugging. An example of Buidler run in verbose mode is:

```
pato@pmbp:asd% npx buidler --verbose
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/internal/core/tasks/builtin-tasks +0ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/builtin-tasks/clean +3ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/builtin-tasks/compile +2ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/builtin-tasks/console +53ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/builtin-tasks/flatten +3ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/builtin-tasks/help +1ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/builtin-tasks/run +2ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/builtin-tasks/test +1ms
  buidler:core:plugins Loading plugin @nomiclabs/buidler-truffle5 +2ms
  buidler:core:plugins Buidler is linked, searching for plugin starting from CWD /private/tmp/asd +0ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-truffle5/dist/index.js +5ms
  buidler:core:plugins Loading plugin @nomiclabs/buidler-web3 +60ms
  buidler:core:plugins Buidler is linked, searching for plugin starting from CWD /private/tmp/asd +0ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-web3/dist/index.js +0ms
  buidler:core:analytics Computing Project Id for /private/tmp/asd +0ms
  buidler:core:analytics Project Id set to acce19ef71fcff30788e87c9d69ca4d0a5aee84c8f8cf696183a21b788730078 +1ms
  buidler:core:analytics Looking up Client Id at /Users/pato/.buidler/config.json +1ms
  buidler:core:analytics Client Id found: 61cf5dde-8c57-447b-bfe0-d57bdd80ab68 +1ms
  buidler:core:bre Creating BuidlerRuntimeEnvironment +0ms
  buidler:core:bre Running task help +1ms
Buidler version 1.0.0-beta.10

Usage: buidler [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]

GLOBAL OPTIONS:

  --config              A Buidler config file.
  --emoji               Use emoji in messages.
  --help                Shows this message, or a task's help if its name is provided
  --max-memory          The maximum amount of memory that Buidler can use.
  --network             The network to connect to.
  --show-stack-traces   Show stack traces.
  --verbose             Enables Buidler verbose logging
  --version             Shows buidler's version.


AVAILABLE TASKS:

  clean         Clears the cache and deletes all artifacts
  compile       Compiles the entire project, building all artifacts
  console       Opens a buidler console
  flatten       Flattens and prints all contracts and their dependencies
  help          Prints this message
  run           Runs a user-defined script after compiling the project
  sample-task   A sample Buidler task
  test          Runs mocha tests

To get help for a specific task run: buidler help [task]

  buidler:core:cli Killing Buidler after successfully running task help +0ms
```

Buidler uses the [debug](https://github.com/visionmedia/debug) package to manage logging. The `DEBUG` environment variable that can be used to turn on the verbose logging and filter it using a simple wildcard pattern.

## Common problems

### Out of memory errors when compiling large projects

If your project has lots of smart contracts, compiling them may require more memory than what
Node allows by default and crash.

If you are experiencing this problem, you can use Buidler's `--max-memory` argument:

```sh
npx buidler --max-memory 4096 compile
```

If you find yourself using this all the time, you can set it with an environment variable in your `.bashrc`: `export BUIDLER_MAX_MEMORY=4096`.
