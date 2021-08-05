# hardhat e2e tests

This package has end to end tests for the packaged version of Hardhat. You can run them with `yarn test`. This will build Hardhat, package it as tgz, and install it in the fixture projects; these projects will then be used in the tests.

## How it works

The entry point of this package is the `run-tests.js` file. This script expects an argument that can be `npm` or `yarn`, and it indicates which package manager will be used to package and install hardhat before the tests are executed.

The script will go through each project in the `test/fixture-projects` directory and do the proper setup. After that, `mocha` will be executed to run the test suites under `test`. This means that `mocha` shouldn't be run directly, because these tests assume that the `fixture-projects` have been set up. Finally, after the tests are run, the fixture projects will be cleaned up.
