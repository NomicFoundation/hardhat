# How to contribute to Buidler

This document contains some tips on how to collaborate in this project.

## Project structure

This repository is a monorepo handled with [Lerna](https://github.com/lerna/lerna).

There's a folder for each subproject in `packages/`. All of them are plugins, except for `/packages/buidler-core` which
is the main project (i.e. the one that published as [@nomiclabs/buidler](npmjs.com/package/@nomiclabs/buidler)).

## Installing

To install this project you have to run:

1. `npm install`
2. `npx lerna bootstrap`

## Testing

All tests are written using [mocha](https://mochajs.org) and [chai](https://www.chaijs.com).

You can run a package's tests by executing `npm run test` inside its folder. Or you can run all the tests at once with
`npm run test` from the root folder.

## Code formatting

We use [Prettier](https://prettier.io/) to format all the code without any special configuration. Whatever Prettier does
is consider The Right Thing. It's completely fine to commit non-prettied code and then reformat it in a later commit.  

We also have [tslint](https://palantir.github.io/tslint/) installed in all the projects. It checks that you have run
Prettier and forbids some dangerous patterns.

The linter is always run in the CI, so make sure it passes before pushing code. You can use `npm run lint` and 
`npm run lint:fix` inside the packages' folders.

## Dependencies

We keep our dependencies versions in sync between the different projects. 

Running `node scripts/check-dependencies.js` from the root folder checks that every project specifies the same versions
of each dependency. It will print an error if the versions get out of sync. 

