# How to contribute to Hardhat

This document contains some tips on how to collaborate in this project.

## Filing an issue

If you find a bug or want to propose a new feature, please [open an issue](https://github.com/nomiclabs/hardhat/issues/new). Pull requests are welcome, but we recommend you discuss it in an issue first, especially for big changes. This will increase the odds that we can accept your PR.

## Project structure

This repository is a monorepo handled with [Yarn workspaces](https://classic.yarnpkg.com/en/docs/workspaces/).

There's a folder for each subproject in `packages/`. All of them are plugins, except for `/packages/hardhat` which
is the main project (i.e. the one that's published as [hardhat](https://npmjs.com/package/hardhat)).

## Installing

To install this project you have to run:

1. `yarn`

## Building the projects

Plugins require hardhat to be built or tested. Our recommendation is to run `yarn watch` from the root folder.
This will keep everything compiled, and these problems will be avoided.

## Testing

All tests are written using [mocha](https://mochajs.org) and [chai](https://www.chaijs.com).

### Per-package
You can run a package's tests by executing `yarn test` inside its folder.

_Note_: for package [hardhat-vyper](./packages/hardhat-vyper) case, a running instance of Docker Desktop is required, with `vyperlang/vyper` image pulled. To install it, run:
```
docker pull vyperlang/vyper:0.1.0b10
```

### Entire project
You can run all the tests at once by running `yarn test` from the root folder.

For the case of package [hardhat-vyper](./packages/hardhat-vyper), an `vyperlang/vyper` docker instance installed is required (see previous section for details). _Exception_ of this requirement is if running on a Windows local machine, in this case we skip it by default since Win 10 Pro version would be also required.

## Code formatting

We use [Prettier](https://prettier.io/) to format all the code without any special configuration. Whatever Prettier does
is considered The Right Thing. It's completely fine to commit non-prettied code and then reformat it in a later commit.

We also have [tslint](https://palantir.github.io/tslint/) installed in all the projects. It checks that you have run
Prettier and forbids some dangerous patterns.

The linter is always run in the CI, so make sure it passes before pushing code. You can use `yarn lint` and
`yarn lint:fix` inside the packages' folders.

## Branching

We work on the branch [`master`](https://github.com/nomiclabs/hardhat/tree/master). Versions of the different packages
are always tagged and pushed to GitHub. So if you are looking for the latests released version of something, please 
refer to the tags.

Please, branch from `master` when implementing a new feature or fixing a 
bug, and use it as the base branch in pull requests.

### Website and documentation branching

If you are modifying the default config, adding a feature, or doing any kind of
technical work that should be reflected in the documentation, the documentation
change should be contained in the same branch and PR than the change.

If you are working purely on the website or documentation, not as a result of
a technical change, you should branch from [`website`](https://github.com/nomiclabs/hardhat/tree/website)
and use it as the base branch in your pull request. Anything merged into 
`website` this way should also be merged into `master`.

Note that the `website` branch is automatically deployed, so take care when 
merging into it.

## Dependencies

We keep our dependencies versions in sync between the different projects.

Running `node scripts/check-dependencies.js` from the root folder checks that every project specifies the same versions
of each dependency. It will print an error if the versions get out of sync.

## Performance and dependencies loading

Hardhat and its plugins are optimized for keeping startup time low.

This is done by selectively requiring dependencies when needed using `import` or `require` following this criteria:

1. If something is only imported for its type, and NOT its value, use a top-level `import ... from "mod"`
1. If a module is in the "Essential modules" list below, use a top-level `import ... from "mod""`.
1. Otherwise, use `await import` or `require` locally in the functions that use it.
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

All these tips assume you are running `yarn watch` from the root directory.

### Linking

You can [link](https://classic.yarnpkg.com/en/docs/cli/link/) any package to test it locally. For example, if you are working on
`hardhat`, you can follow these steps:

1. Go to `packages/hardhat-core` and run `yarn link`
2. Go to some hardhat project and run `yarn link hardhat`

Now any change you make in the code will be reflected in that project.

Note that `yarn link` won't create an executable in `node_modules/.bin/hardhat`. To work around this we recommend
having an alias like this:

```bash
alias lhh='node --preserve-symlinks $(node -e "console.log(require.resolve(\"hardhat/internal/cli/cli.js\"))")'
```

### Yalc

If for any reason linking doesn't work for you, you can use [`yalc`](https://github.com/whitecolor/yalc).

1. Go to `packages/hardhat-core` and run `yalc publish`
2. Go to some hardhat project and run `yalc add hardhat`

Unlike linking, if you make a change in the code, you'll need to repeat the process.

### yarn pack

An even more realistic way of using your local changes in a project is to use [`yarn pack`](https://classic.yarnpkg.com/en/docs/cli/pack/):

1. Go to `packages/hardhat-core` and run `yarn pack`. This will create a `nomiclabs-hardhat-x.y.z.tgz` file in that directory.
2. Go to some hardhat project and run `yarn add /path/to/hardhat/packages/hardhat/nomiclabs-hardhat-x.y.z.tgz`.

Unlike linking, if you make a change in the code, you'll need to repeat the process.

### ndb

If you want to debug something, you can use [`ndb`](https://github.com/GoogleChromeLabs/ndb). First add a `debugger`
statement wherever you want. Then link your project. Finally, run hardhat as normally but prepend the command with
`ndb`. For example, you can do `ndb npx hardhat compile` to debug some part of the compile task.

## Common errors

### Monkey-patching dependencies within plugins

You should avoid monkey-patching whenever possible. But if it's necessary to do so, you should pay extra care when doing
it in a Hardhat plugin or your tests may fail in very hard to debug ways.

When tests are run, Hardhat gets initialized multiple times, and that means unloading and reloading config and plugin
modules. This unloading process may or may not lead to your dependencies being reloaded. This makes monkey-patching 
harder, as you may apply the same patch multiple times to the same module.

This problem is normally not present if you are monkey-patching an object that you initialized, but it is when 
monkey-patching a class, its prototype, or a singleton object initialized by the library itself.

For an example on how to do it properly, please take a look at the `hardhat-truffle5` plugin.
