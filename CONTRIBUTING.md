# How to contribute to Buidler

This document contains some tips on how to collaborate in this project.

## Project structure

This repository is a monorepo handled with [Lerna](https://github.com/lerna/lerna).

There's a folder for each subproject in `packages/`. All of them are plugins, except for `/packages/buidler-core` which
is the main project (i.e. the one that's published as [@nomiclabs/buidler](https://npmjs.com/package/@nomiclabs/buidler)).

## Installing

To install this project you have to run:

1. `npm install && node scripts/install.js`

## Building the projects

Plugins require buidler-core to be built or tested. Our recommendation is to run `npm run watch` from the root folder.
This will keep everything compiled, and these problems will be avoided.

## Testing

All tests are written using [mocha](https://mochajs.org) and [chai](https://www.chaijs.com).

You can run a package's tests by executing `npm run test` inside its folder. Or you can run all the tests at once with
`npm run test` from the root folder.

## Code formatting

We use [Prettier](https://prettier.io/) to format all the code without any special configuration. Whatever Prettier does
is considered The Right Thing. It's completely fine to commit non-prettied code and then reformat it in a later commit.

We also have [tslint](https://palantir.github.io/tslint/) installed in all the projects. It checks that you have run
Prettier and forbids some dangerous patterns.

The linter is always run in the CI, so make sure it passes before pushing code. You can use `npm run lint` and
`npm run lint:fix` inside the packages' folders.

## Dependencies

We keep our dependencies versions in sync between the different projects.

Running `node scripts/check-dependencies.js` from the root folder checks that every project specifies the same versions
of each dependency. It will print an error if the versions get out of sync.

## Performance and dependencies loading

Buidler and its plugins are optimized for keeping startup time low.

This is done by selectively requiring dependencies when needed using `import` or `require` following this criteria:

1. If something is only imported for its type, and NOT its value, use a top-level `import ... from "mod"`
1. If a module is in the least below, use a top-level `import ... from "mod""`.
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
