# Building plugins

In this section, we will explore the creation of plugins for Hardhat, which are the key component for integrating other tools and extending the built-in functionality.

## What exactly are plugins in Hardhat?

Plugins are bits of reusable configuration. Anything that you can do in a plugin can also be done in your config file. You can test your ideas in a config file and then move them into a plugin when ready.

When developing a plugin the main tools available to integrate new functionality are extending the [Hardhat Runtime Environment](/advanced/hardhat-runtime-environment.md), extending the Hardhat config, defining new tasks and overriding existing ones, which are all configuration actions achieved through code.

Some examples of things you could achieve by creating a plugin are: running a linter when the `check` task runs, using different compiler versions for different files or generating a UML diagram for your contracts.

## Extending the Hardhat Runtime Environment

Let’s go through the process of creating a plugin that adds new functionality to the Hardhat Runtime Environment. By doing this, we make sure our new feature is available everywhere. This means your plugin users can access it from tasks, tests, scripts and the Hardhat console.

The Hardhat Runtime Environment (HRE) is configured through a queue of extension functions that you can add to using the `extendEnvironment()` function. It receives one parameter which is a callback which will be executed after the HRE is initialized. If `extendEnvironment` is called multiple times, its callbacks will be executed in order.

For example, adding the following to `hardhat.config.js`:

```js
extendEnvironment((hre) => {
  hre.hi = "Hello, Hardhat!";
});
```

Will make `hi` available everywhere where the environment is accessible.

```js
extendEnvironment((hre) => {
  hre.hi = "Hello, Hardhat!";
});

task("envtest", async (args, hre) => {
  console.log(hre.hi);
});

module.exports = {};
```

Will yield:

```
$ npx hardhat envtest
Hello, Hardhat!
```

This is literally all it takes to put together a plugin for Hardhat. Now `hi` is available to be used in the Hardhat console, your tasks, tests and other plugins.

## Extending the Hardhat provider

Next, we can take a look at how to add features on top of the default provider offered by Hardhat, found on `hre.network.provider`. Doing this, any extra functionality you add will be available everywhere, just as it would if you extend the [Hardhat Runtime Environment](#extending-the-hardhat-runtime-environment).

The Hardhat provider is configured through a queue of extension functions that you can add to by using the `extendProvider()` function. It receives one parameter which is a callback to be executed after the first call to `hre.network.provider.request()` is made. This happens only once. If `extendProvider` is called multiple times, its callbacks will be executed in order, and Hardhat will wait on each one to finish before executing the next one. Returning an entirely new provider is possible but not advisable.

These callbacks can be `async`, and they will be `await`ed until they finish, so you should be careful when adding any functionality that might take a long time to resolve.

It's important to keep in mind that after all callbacks are executed, the provider will be wrapped by Hardhat's built-in extenders. This means that the object returned by `extendProvider` is not the same as the one found on `hre.network.provider`, but its functionality is included there.

For example, adding the following to `hardhat.config.js`:

```js
import { ProviderWrapper } from 'hardhat/plugins'

class FixedGasProvider extends ProviderWrapper {
  constructor(
    public readonly gasPrice,
    protected readonly _wrappedProvider
  ) {
    super(_wrappedProvider);
  }

  public async request(args) {
    if (args.method === "eth_estimateGas") {
      return this.gasPrice;
    } else if (args.method === "eth_sendTransaction") {
      const params = this._getParams(args);
      const tx = params[0];

      // let's pretend that EIP-1559 never happened
      tx.gasPrice = this.gasPrice;
    }

    return this._wrappedProvider.request(args);
  }
}

extendProvider(async (provider, config, network) => {
  // We fix the gas price to be set by the config or to a random high value
  const gasPrice = config.fixedGasPrice || "0x1000000"
  const newProvider = new FixedGasProvider(gasPrice, provider);
  return newProvider;
});
```

Will make the `hre` provider use that gas price value everywhere it's used:

```js
task("request", async (args, hre) => {
  await hre.network.provider.request({method: /*{ method arguments }*/}); // this will run FixedGasProvider's request method above
});

module.exports = {};
```

## Using the Hardhat TypeScript plugin boilerplate

For a complete example of a plugin you can take a look at the [Hardhat TypeScript plugin boilerplate project](https://github.com/NomicFoundation/hardhat-ts-plugin-boilerplate/).

Plugins don't need to be written in TypeScript, but we recommend doing it, as many of our users use it. Creating a plugin in JavaScript can lead to a subpar experience for them.

### Extending the HRE

To learn how to successfully extend the [HRE](./hardhat-runtime-environment.md) in TypeScript, and to give your users type information about your extension, take a look at [`src/index.ts`](https://github.com/NomicFoundation/hardhat-ts-plugin-boilerplate/blob/master/src/index.ts) in the boilerplate repo and read the [Extending the HRE](./hardhat-runtime-environment.md#extending-the-hre) documentation.

Make sure to keep the type extension in your main file, as that convention is used across different plugins.

### Extending the Hardhat config

The boilerplate project also has an example on how to extend the Hardhat config.

We strongly recommend doing this in TypeScript and properly extending the config types.

An example on how to add fields to the Hardhat config can be found in [`src/index.ts`](https://github.com/NomicFoundation/hardhat-ts-plugin-boilerplate/blob/master/src/index.ts).

## Plugin development best practices

### Throwing errors from your plugins

To show better stack traces to your users when an error is meant to interrupt a task's execution, please consider throwing `HardhatPluginError` errors, which can be found in `hardhat/plugins`.

If your error originated in your user's code, like a test or script calling one of your functions, you shouldn't use `HardhatPluginError`.

### Optimizing your plugin for better startup time

Keeping startup time short is vital to give a good user experience.

To do so, Hardhat and its plugins delay any slow import or initialization until the very last moment. To do so, you can use `lazyObject`, and `lazyFunction` from `hardhat/plugins`.

An example on how to use them is present in [`src/index.ts`](https://github.com/NomicFoundation/hardhat-ts-plugin-boilerplate/blob/master/src/index.ts).

## Notes on dependencies

Knowing when to use a `dependency` or a `peerDependency` can be tricky. We recommend [these](https://yarnpkg.com/blog/2018/04/18/dependencies-done-right/) [articles](https://lexi-lambda.github.io/blog/2016/08/24/understanding-the-npm-dependency-model/) to learn about their distinctions.

If you are still in doubt, these can be helpful:

- **Rule of thumb #1:** Hardhat MUST be a peer dependency.

- **Rule of thumb #2:** If your plugin P depends on another plugin P2, P2 should be a peer dependency of P, and P2's peer dependencies should be peer dependencies of P.

- **Rule of thumb #3:** If you have a non-Hardhat dependency that your users may `require()`, it should be a peer dependency.

- **Rule of thumb #4:** Every `peerDependency` should also be a `devDependency`.

## Hooking into the user's workflow

To integrate into your users' existing workflow, we recommend that plugin authors override built-in tasks whenever it makes sense.

Examples of suggested overrides are:

- Preprocessing smart contracts should override one of the `compile` subtasks.
- Linter integrations should override the `check` task.
- Plugins generating intermediate files should override the `clean` task.

For a list of all the built-in tasks and subtasks please take a look at [`task-names.ts`](https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-core/src/builtin-tasks/task-names.ts)
