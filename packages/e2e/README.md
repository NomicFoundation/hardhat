# hardhat e2e tests

This package has end to end tests for the packaged version of Hardhat. You can run them with `yarn test`. This will build Hardhat, package it as tgz, and run the tests.

## How it works

The entry point of this package is the `run-tests.js` file. This script expects an argument that can be `npm` or `yarn`, and it indicates which package manager will be used to package hardhat before the tests are executed.

After that, `mocha` will be executed to run the test suites under `test`. This means that `mocha` shouldn't be run directly, because these tests assume that the tgz file has been built and that its path is available as an environment variable.

The tests copy each fixture project directory in a temporary directory, and then install hardhat there using the tgz file.
