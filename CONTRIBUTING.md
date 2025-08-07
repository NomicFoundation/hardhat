# How to contribute to Hardhat

This document contains some tips on how to collaborate in this project.

## Filing an issue

If you find a bug or want to propose a new feature, please [open an issue](https://github.com/nomiclabs/hardhat/issues/new). Pull requests are welcome, but we recommend you discuss it in an issue first, especially for big changes. This will increase the odds that we can accept your PR.

## GitHub project

We use a [GitHub project](https://github.com/orgs/NomicFoundation/projects/4/views/11) to triage new issues and plan our work. You can check our list of [good first issues](https://github.com/orgs/NomicFoundation/projects/4/views/7) there.

## Project structure

This repository is a monorepo handled with [pnpm](https://pnpm.io/) and [pnpm workspaces](https://pnpm.io/workspaces).

There's a folder for each subproject in `packages/`. All of them are plugins, except for `/packages/hardhat-core` which is the main project (i.e. the one that's published as [hardhat](https://npmjs.com/package/hardhat) in npm).

## Installing

To install the project's dependencies, run `pnpm i` in the root directory of the repository.

## Building the projects

Plugins require hardhat to be built or tested. Our recommendation is to run `pnpm build` from the root folder.

## Testing

All tests are written using [node test runner](https://nodejs.org/api/test.html).

### Per-package

You can run a package's tests by executing `pnpm test` inside its folder.

### Entire project

You can run all the tests at once by running `pnpm test` from the root folder.

## Code formatting

We use [Prettier](https://prettier.io/) to format all the code without any special configuration. Whatever Prettier does is considered The Right Thing. It's completely fine to commit non-prettied code and then reformat it in a later commit.

We also have [eslint](https://eslint.org/) installed in all the projects. It checks that you have run Prettier and forbids some dangerous patterns.

The linter is always run in the CI, so make sure it passes before pushing code. You can use `pnpm lint` and `pnpm lint:fix` inside the packages' folders.

## Branching

We work on two branches, [`main`](https://github.com/nomiclabs/hardhat/tree/main) and [`development`](https://github.com/nomiclabs/hardhat/tree/development).

The `main` branch is meant to be kept in sync with the latest released version of each package. Most pull requests are based on `main`, so when in doubt use this branch.

The development branch is meant to be used for major, risky changes that are ready, but we can't or don't want to release yet. We never release new versions from development. When we want to release the changes from development, we go through a stricter QA process, merge those changes into main, and release from main. Examples of things that should be based on development are features that require significant changes to the codebase, or bug fixes that involve a major refactor.

### Website and documentation branching

If you are modifying the default config, adding a feature, or doing any kind of technical work that should be reflected in the documentation, the documentation change should be contained in the same branch and PR as the change.

If you are working purely on the website or documentation, not as a result of a technical change, you should branch from [`main`](https://github.com/nomiclabs/hardhat/tree/main) and use it as the base branch in your pull request.

Note that the `main` branch is automatically deployed, so take care when merging into it.

## Dependencies

We keep our dependencies versions in sync between the different projects.

Running `node scripts/check-dependencies.js` from the root folder checks that every project specifies the same versions of each dependency. It will print an error if the versions get out of sync.

## Performance and dependencies loading

Hardhat and its plugins are optimized for keeping startup time low.

This is done by selectively requiring dependencies when needed using `import` or `require` following this criteria:

1. If something is only imported for its type, and NOT its value, use a top-level `import ... from "mod"`.
1. If a module is in the "Essential modules" list below, use a top-level `import ... from "mod"`.
1. Otherwise, use `await import` or `require` locally in the functions that use it:
   1. If the function is sync, use node's `require`
   2. If the function is an async, use `await import`

Note that these rules don't apply to tests. You can always use top-level imports there.

### Essential modules

This is a list of the modules that always get loaded during startup:

- `fs`
- `path`
- `util`
- `find-up`
- `fs-extra`
- `chalk`
- `semver`
- `source-map-support/register`

## Developing locally

The project can be built by `pnpm build` from the root directory.

### Linking

You can [link](https://docs.npmjs.com/cli/v9/commands/npm-link/) any package to test it locally. While the rest of the commands we run use `pnpm`, we recommend you use `npm` for linking. For example, if you are working on `hardhat`, you can follow these steps:

1. Go to `packages/hardhat-core` and run `npm link`
2. Go to some hardhat project and run `npm link hardhat`

Now any change you make in the code will be reflected in that project.

### Yalc

If for any reason linking doesn't work for you, you can use [`yalc`](https://github.com/whitecolor/yalc):

1. Go to `packages/hardhat-core` and run `yalc publish`
2. Go to some hardhat project and run `yalc add hardhat`

Unlike linking, if you make a change in the code, you'll need to repeat the process.

### pnpm pack

An even more realistic way of using your local changes in a project is to use [`pnpm pack`](https://pnpm.io/cli/pack):

1. Go to `packages/hardhat-core` and run `pnpm pack`. This will create a `hardhat-x.y.z.tgz` file in that directory.
2. Go to some hardhat project and run `npm install /path/to/hardhat/packages/hardhat-core/hardhat-x.y.z.tgz`.

Unlike linking, if you make a change in the code, you'll need to repeat the process.

### ndb

If you want to debug something, you can use [`ndb`](https://github.com/GoogleChromeLabs/ndb). First add a `debugger` statement wherever you want. Then link your project. Finally, run hardhat as normally but prepend the command with `ndb`. For example, you can do `ndb npx hardhat compile` to debug some part of the compile task.

## Common errors

### Monkey-patching dependencies within plugins

You should avoid monkey-patching whenever possible. But if it's necessary to do so, you should pay extra care when doing it in a Hardhat plugin or your tests may fail in very hard to debug ways.

When tests are run, Hardhat gets initialized multiple times, and that means unloading and reloading config and plugin modules. This unloading process may or may not lead to your dependencies being reloaded. This makes monkey-patching harder, as you may apply the same patch multiple times to the same module.

This problem is normally not present if you are monkey-patching an object that you initialized, but it is when monkey-patching a class, its prototype, or a singleton object initialized by the library itself.

For an example on how to do it properly, please take a look at the `hardhat-truffle5` plugin.

## Note about small PRs and airdrop farming

We generally really appreciate external contributions, and strongly encourage meaningful additions and fixes! However, due to a recent increase in small PRs potentially created to farm airdrops, we might need to close a PR without explanation if any of the following apply:

- It is a change of very minor value that still requires additional review time/fixes (e.g. PRs fixing trivial spelling errors that can’t be merged in less than a couple of minutes due to incorrect suggestions)
- It introduces inconsequential changes (e.g. rewording phrases)
- The author of the PR does not respond in a timely manner
- We suspect the Github account of the author was created for airdrop farming

## Contributing Checklist

Shortlist of steps that should be always considered when committing changes. All errors reported by any command must be resolved before moving ahead.

> All commands expect that they are executed from the root of the repository.

1) `pnpm build` - build the entire project
2) `pnpm lint` - check formatting and code structure
3) `pnpm lint:fix` - fix formatting issues
4) `pnpm test` - run all tests

Commit changes and create a PR once all the commands above are successful. The CI pipeline would block the PR otherwise.

5) Create a branch for the change
   * there is a `Create a branch` option in the `Development` section in case the change is tracked by an issue
6) Create a PR from the new branch to `main`
   * Add description that explains the change


