# buidler-etherscan
Buidler plugin for verifying contracts on Etherscan

## Installation

We recommend developing Buidler plugins using yarn. To start working on your project, just run

- `yarn`
- `yarn add --peer @nomiclabs/buidler@^1.0.0-beta.2`

## Updating Buidler or other peer dependencies

When updating/adding Buidler or other peer dependencies, you should update the `.travis.yml` file's install section. The right version of all of them has to be installed in a single line, after `yarn`.

## Testing

Running `yarn test` will run every test located in the `test/` folder. They use [mocha](https://mochajs.org) and [chai](https://www.chaijs.com/), but you can customize them.

You can run only integration tests with `yarn run test:integration` and unit with `yarn run test:unit`.

For integration tests, it is required to set env (.env file) variable `WALLET_PRIVATE_KEY` with ropsten wallet private key.

We recommend creating unit tests for your own modules, and integration tests for the interaction of the plugin with Buidler and its dependencies.

## Linting and autoformat

All all of Buidler projects use [prettier](https://prettier.io/) and [tslint](https://palantir.github.io/tslint/).

You can check if your code style is correct by running `yarn lint`, and fix it with `yarn lint:fix`.

## Building the project

Just run `yarn buidl` ️👷‍

## README file

We recommend writing a README that contains the following information:

* What is it
* How to install it
* New tasks
* Environment extensions
