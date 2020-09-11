# Building plugins

This section is an overview of how to create a plugin. For a complete example of a
plugin go to the [TypeScript plugin boilerplate project](https://github.com/nomiclabs/buidler-ts-plugin-boilerplate/).

## Plugin functionality

Plugins are bits of reusable configuration. Anything that you can do in a plugin, can also be done in your config file. You can test your ideas in a config file, and move them into a plugin when ready.

The main things that plugins can do are extending the Buidler Runtime Environment, extending the Buidler config, defining new tasks, and overriding existing ones.

### Extending the BRE

To learn how to successfully extend the [BRE](./buidler-runtime-environment.md) in TypeScript, and to give your users type information about your extension, take a look at [`src/index.ts`](https://github.com/nomiclabs/buidler-ts-plugin-boilerplate/blob/master/src/index.ts) in the boilerplate repo and read the [Extending the BRE](./buidler-runtime-environment.md#extending-the-bre) documentation.

Make sure to keep the type extension in your main file, as that convention is used across different plugins.

### Extending the Buidler config

An example on how to add fields to the Buidler config can be found in [`src/index.ts`](https://github.com/nomiclabs/buidler-ts-plugin-boilerplate/blob/master/src/index.ts).

Note that all config extension's have to be optional.

### Throwing errors from your plugins

To show better stack traces to your users, please consider throwing [`BuidlerPluginError`](/api/classes/buidlerpluginerror.html#constructors) errors, which can be found in `@nomiclabs/buidler/plugins`.

If your error originated in your user's code, like a test or script calling one of your functions, you shouldn't use `BuidlerPluginError`.

### Optimizing your plugin for better startup time

Keeping startup time short is vital to give a good user experience. To do so, Buidler and its plugins delay any slow import or initialization until the very last moment. To do so, you can use `lazyObject`, and `lazyFunction` from `@nomiclabs/buidler/plugins`.

An example on how to use them is present in [`src/index.ts`](https://github.com/nomiclabs/buidler-ts-plugin-boilerplate/blob/master/src/index.ts).

## Notes on dependencies

Knowing when to use a `dependency` or a `peerDependency` can be tricky. We recommend [these](https://yarnpkg.com/blog/2018/04/18/dependencies-done-right/) [articles](https://lexi-lambda.github.io/blog/2016/08/24/understanding-the-npm-dependency-model/) to learn about their distinctions.

If you are still in doubt, these can be helpful:

- **Rule of thumb #1:** Buidler MUST be a peer dependency.

- **Rule of thumb #2:** If your plugin P depends on another plugin P2, P2 should be a peer dependency of P, and P2's peer dependencies should be peer dependencies of P.

- **Rule of thumb #3:** If you have a non-Buidler dependency that your users may `require()`, it should be a peer dependency.

- **Rule of thumb #4:** Every `peerDependency` should also be a `devDependency`.

Also, if you depend on a Buidler plugin written in TypeScript, you should add it's type extensions' `.d.ts` file to the `files` array of `tsconfig.json`.

## Hooking into the user's workflow

To integrate into your users' existing workflow, we recommend plugin authors to override built-in tasks whenever it makes sense.

Examples of suggested overrides are:

- Preprocessing smart contracts should override one of the `compile` internal tasks.
- Linter integrations should override the `check` task.
- Plugins generating intermediate files should override the `clean` task.

For a list of all the built-in tasks and internal tasks please take a look at [`task-names.ts`](https://github.com/nomiclabs/buidler/blob/master/packages/buidler-core/src/builtin-tasks/task-names.ts)
