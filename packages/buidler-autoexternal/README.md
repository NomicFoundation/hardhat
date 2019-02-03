# Buidler TypeScript plugin boilerplate

This is a sample Buidler plugin written in TypeScript. Creating a Buidler plugin can be as easy as extracting part of your config into a different file, but this sample project comes with many more features:

- A mocha test suit ready to use
- TravisCI already setup
- A package.json with scripts and publishing info
- Examples on how to do different things

## Installation

We recommend developing Buidler plugins using yarn. To start working on your project, just run

- `yarn`
- `yarn add --peer @nomiclabs/buidler@^1.0.0-alpha.5`

## Plugin functionality

Plugins are bits of reusable configuration. Anything that you can do in a plugin, can also be done in your config file. You can test your ideas in a config file, and move them into a plugin when ready.

The main things that plugins can do are extending the Buidler Runtime Environment, extending the Buidler config, defining new tasks, and overriding existing ones.

### Extending the Buidler Runtime Environment

To learn how to successfully override the Buidler Runtime Environment in TypeScript, and to give your users type information about your extension, take a look at [src/index.ts](./src/index.ts).

Make sure to keep the type extension in your main file, as that convention is used across different plugins.

### Extending the Buidler config

An example on how to add fields to the Buidler config can be found in [src/index.ts](./src/index.ts).

Note that all config extension's have to be optional.

### Throwing errors from your plugins

To show better stack traces to your users, please only throw `BuidlerPluginError` errors, which can be found in `@nomiclabs/buidler/plugins`.

### Optimizing your plugin for better startup time

Keeping startup time short is vital to give a good user expirience. To do so, Buidler and its plugins delay any slow import or inintialization until last moment. To do so, you can use `lazyObject`, and `lazyFunction` from `@nomiclabs/buidler/plugins`.

An example on how to use them is present in [src/index.ts](./src/index.ts).

## Notes on dependencies

Knowing when to use a `dependency` or a `peerDependency` can be tricky. We recommend [these](https://yarnpkg.com/blog/2018/04/18/dependencies-done-right/) [articles](https://lexi-lambda.github.io/blog/2016/08/24/understanding-the-npm-dependency-model/) to learn about their distinctions.

If you are still in doubt, these can be helpful:

- Rule of thumb #1: Buidler MUST be a peer dependency.
- Rule of thumb #2: If your plugin P depends on a another plugin P2, P2 should be a dependency of P, and P2's peer dependencies should be peer dependencies of P.
- Rule of thumb #3: If you have a non-Buidler dependency that your users may `require()`, it should be a peer dependency.

Also, if you depend on a Buidler plugin written in TypeScript, you should add it's main `.d.ts` to the `include` array of `tsconfig.json`.

## Updating Buidler or other peer dependencies

When updating/adding Buidler or other peer dependencies, you should update the `.travis.yml` file's install section. The right version of all of them has to be installed in a single line, after `yarn`.

## Testing

Running `yarn test` will run every test located in the `test/` folder. They use [mocha](https://mochajs.org) and [chai](https://www.chaijs.com/), but you can customize them.

We recommend creating unit tests for your own modules, and integration tests for the interaction of the plugin with Buidler and its dependencies.

## Linting and autoformat

All all of Buidler projects use [prettier](https://prettier.io/) and [tslint](https://palantir.github.io/tslint/).

You can check if your code style is correct by running `yarn lint`, and fix it with `yarn lint:fix`.

## Building the project

Just run `yarn buidl` ️👷‍
