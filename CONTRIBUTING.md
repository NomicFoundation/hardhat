# How to contribute to Buidler

This document contains some tips on how to collaborate in this project.

## Project structure

This repository is a monorepo handled with [Lerna](https://github.com/lerna/lerna).

There's a folder for each subproject in `packages/`. All of them are plugins, except for `/packages/buidler-core` which
is the main project (i.e. the one that's published as [@nomiclabs/buidler](https://npmjs.com/package/@nomiclabs/buidler)).

## Installing

To install this project you have to run:

1. `npm install`

## Building the projects

Plugins require buidler-core to be built or tested. Our recommendation is to run `npm run watch` from the root folder.
This will keep everything compiled, and these problems will be avoided.

## Testing

All tests are written using [mocha](https://mochajs.org) and [chai](https://www.chaijs.com).

### Per-package
You can run a package's tests by executing `npm test` inside its folder.

_Note_: for package [buidler-vyper](./packages/buidler-vyper) case, a running instance of Docker Desktop is required, with `ethereum/vyper` image pulled. To install it, run:
```
docker pull ethereum/vyper:0.1.0b10
```

### Entire project
You can run all the tests at once by running `npm test` from the root folder.

For the case of package [buidler-vyper](./packages/buidler-vyper), an `ethereum/vyper` docker instance installed is required (see previous section for details). _Exception_ of this requirement is if running on a Windows local machine, in this case we skip it by default since Win 10 Pro version would be also required.

## Code formatting

We use [Prettier](https://prettier.io/) to format all the code without any special configuration. Whatever Prettier does
is considered The Right Thing. It's completely fine to commit non-prettied code and then reformat it in a later commit.

We also have [tslint](https://palantir.github.io/tslint/) installed in all the projects. It checks that you have run
Prettier and forbids some dangerous patterns.

The linter is always run in the CI, so make sure it passes before pushing code. You can use `npm run lint` and
`npm run lint:fix` inside the packages' folders.

## Branching

We work on the branch [`development`](https://github.com/nomiclabs/buidler/tree/development)
and keep `master` in sync with the latest release.

Please, branch from `development` when implementing a new feature or fixing a 
bug, and use it as the base branch in pull requests.

### Website and documentation branching

If you are modifying the default config, adding a feature, or doing any kind of
technical work that should be reflected in the documentation, the documentation
change should be contained in the same branch and PR than the change.

If you are working purely on the website or documentation, not as a result of
a technical change, you should branch from [`website`](https://github.com/nomiclabs/buidler/tree/website)
and use it as the base branch in your pull request. Anything merged into 
`website` this way should also be merged into `development`.

Note that the `website` branch is automatically deployed, so take care when 
merging into it.

## Dependencies

We keep our dependencies versions in sync between the different projects.

Running `node scripts/check-dependencies.js` from the root folder checks that every project specifies the same versions
of each dependency. It will print an error if the versions get out of sync.

## Performance and dependencies loading

Buidler and its plugins are optimized for keeping startup time low.

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
- `deepmerge`
- `source-map-support/register`

## Developing locally

All these tips assume you are running `npm run watch` from the root directory.

### Linking

You can [link](https://docs.npmjs.com/cli/link) any package to test it locally. For example, if you are working on
`buidler-core`, you can follow these steps:

1. Go to `packages/buidler-core` and run `npm link`
2. Go to some buidler project and run `npm link @nomiclabs/buidler`

Alternatively, you can go to your buidler project and run `npm link /path/to/buidler/packages/buidler-core`.

Now any change you make in the code will be reflected in that project.

### Yalc

If for any reason linking doesn't work for you, you can use [`yalc`](https://github.com/whitecolor/yalc).

1. Go to `packages/buidler-core` and run `yalc publish`
2. Go to some buidler project and run `yalc add @nomiclabs/buidler`

Unlike linking, if you make a change in the code, you'll need to repeat the process.

### npm pack

An even more realistic way of using your local changes in a project is to use [`npm pack`](https://docs.npmjs.com/cli-commands/pack.html):

1. Go to `packages/buidler-core` and run `npm pack`. This will create a `nomiclabs-buidler-x.y.z.tgz` file in that directory.
2. Go to some buidler project and run `npm install /path/to/buidler/packages/buidler-core/nomiclabs-buidler-x.y.z.tgz`.

Unlike linking, if you make a change in the code, you'll need to repeat the process.

### ndb

If you want to debug something, you can use [`ndb`](https://github.com/GoogleChromeLabs/ndb). First add a `debugger`
statement wherever you want. Then link your project. Finally, run buidler as normally but prepend the command with
`ndb`. For example, you can do `ndb npx buidler compile` to debug some part of the compile task.

## Common errors

### Monkey-patching dependencies multiple times

You should avoid monkey-patching whenever possible. But if it's necessary to do so, you should pay extra care when doing
it in Buidler or your tests may fail in very hard to debug ways.

When tests are run, Buidler gets initialized multiple times. That may lead to monkey-patching the same multiple times.
To avoid this, keep references to the original implementations. In order to do this, you need to get it just once:

```js
let originalImpl; // May be a global

// ...

if (originalImpl === undefined) {
  originalImpl = lib.func;
}

lib.func = function(...args) {
  // Do something;
  return originalImpl.apply(this, args);
};
```

This isn't normally a problem if you are monkey-patching an object's methods. But it is when monkey-patching a class
or its prototype.
