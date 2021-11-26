---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/sc-forks/solidity-coverage/tree/master/HARDHAT_README.md)
:::

[![Gitter chat](https://badges.gitter.im/sc-forks/solidity-coverage.svg)][18]
![npm (tag)](https://img.shields.io/npm/v/solidity-coverage/latest)
[![CircleCI](https://circleci.com/gh/sc-forks/solidity-coverage.svg?style=svg)][20]
[![codecov](https://codecov.io/gh/sc-forks/solidity-coverage/branch/beta/graph/badge.svg)][21]
[![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)][26]

# solidity-coverage

Solidity code coverage plugin for [Hardhat](http://hardhat.org).

## What

![coverage example][22]

+ For more details about how it works and potential limitations, see [the accompanying article][16].
+ `solidity-coverage` is also [JoinColony/solcover][17]


## Installation

```bash
$ npm install --save-dev solidity-coverage
```

And add the following to your `.config.js`:

```js
require("solidity-coverage");
```

Or, if you are using TypeScript, add this to your hardhat.config.ts:

```ts
import "solidity-coverage"
```

## Tasks

This plugin implements a `coverage` task

```bash
npx hardhat coverage [options]
```

| Option <img width=200/> | Example <img width=750/>| Description <img width=1000/> |
|--------------|------------------------------------|--------------------------------|
| testfiles  | `--testfiles "test/registry/*.ts"` | Test file(s) to run. (Globs must be enclosed by quotes.)|
| solcoverjs | `--solcoverjs ./../.solcover.js` | Relative path from working directory to config. Useful for monorepo packages that share settings. (Path must be "./" prefixed) |
| network    | `--network development` | Run with a ganache client over http using network settings defined in `hardhat.config.js`. (Hardhat is the default network) |


## Configuration

Options can be specified in a `.solcover.js` config file located in the root directory of your project.

**Config Example:**
```javascript
module.exports = {
  skipFiles: ['Routers/EtherRouter.sol']
};
```

| Option <img width=200/>| Type <img width=200/> | Default <img width=1300/> | Description <img width=800/> |
| ------ | ---- | ------- | ----------- |
| silent | *Boolean* | false | Suppress logging output |
| client | *Object* | undefined | *Ganache only*: Useful if you need a specific ganache version. An example value is: `require('ganache-cli')` |
| providerOptions | *Object* | `{ }` | *Ganache only*: [ganache-core options][1]  |
| skipFiles | *Array* | `['Migrations.sol']` | Array of contracts or folders (with paths expressed relative to the `contracts` directory) that should be skipped when doing instrumentation. |
| istanbulFolder | *String* | `./coverage` |  Folder location for Istanbul coverage reports. |
| istanbulReporter | *Array* | `['html', 'lcov', 'text', 'json']` | [Istanbul coverage reporters][2]  |
| mocha | *Object* | `{ }` | [Mocha options][3] to merge into existing mocha config. `grep` and `invert` are useful for skipping certain tests under coverage using tags in the test descriptions.|
| onServerReady[<sup>*</sup>][14] | *Function* |   | Hook run *after* server is launched, *before* the tests execute. Useful if you need to use the Oraclize bridge or have setup scripts which rely on the server's availability. [More...][23] |
| onCompileComplete[<sup>*</sup>][14] | *Function* |  | Hook run *after* compilation completes, *before* tests are run. Useful if you have secondary compilation steps or need to modify built artifacts. [More...][23]|
| onTestsComplete[<sup>*</sup>][14] | *Function* |  | Hook run *after* the tests complete, *before* Istanbul reports are generated. [More...][23]|
| onIstanbulComplete[<sup>*</sup>][14] | *Function* |  | Hook run *after* the Istanbul reports are generated, *before* the ganache server is shut down. Useful if you need to clean resources up. [More...][23]|

[<sup>*</sup> Advanced use][14]

## Usage

+ Coverage runs tests a little more slowly.
+ Coverage uses the Hardhat network by default.
+ Coverage [distorts gas consumption][13]. Tests that check exact gas consumption should be [skipped][24].
+ :warning:  Contracts are compiled **without optimization**. Please report unexpected compilation faults to [issue 417][25]

## Using with ganache

Begining with `v0.7.12`, this plugin runs directly on the Hardhat network by default (for speed).

If you want to use a ganache based http network, you can specify it by name using the `--network` cli option. The plugin will then launch its own coverage enabled ganache instance which can be configured in `.solcover.js` via the `providerOptions` key.

## Documentation

More documentation, including FAQ and information about solidity-coverage's API [is available here][28].


[1]: https://github.com/trufflesuite/ganache-core#options
[2]: https://istanbul.js.org/docs/advanced/alternative-reporters/
[3]: https://mochajs.org/api/mocha
[4]: https://github.com/sc-forks/solidity-coverage/blob/master/docs/faq.md#running-out-of-gas
[5]: https://github.com/sc-forks/solidity-coverage/blob/master/docs/faq.md#running-out-of-memory
[6]: https://github.com/sc-forks/solidity-coverage/blob/master/docs/faq.md#running-out-of-time
[7]: https://github.com/sc-forks/solidity-coverage/blob/master/docs/faq.md#continuous-integration
[8]: https://github.com/sc-forks/solidity-coverage/blob/master/docs/faq.md#notes-on-branch-coverage
[9]: https://sc-forks.github.io/metacoin/
[10]: https://coveralls.io/github/OpenZeppelin/openzeppelin-solidity?branch=master
[11]: https://github.com/sc-forks/solidity-coverage/tree/master/test/units
[12]: https://github.com/sc-forks/solidity-coverage/issues
[13]: https://github.com/sc-forks/solidity-coverage/blob/master/docs/faq.md#notes-on-gas-distortion
[14]: https://github.com/sc-forks/solidity-coverage/blob/master/docs/advanced.md
[15]: #config-options
[16]: https://blog.colony.io/code-coverage-for-solidity-eecfa88668c2
[17]: https://github.com/JoinColony/solcover
[18]: https://gitter.im/sc-forks/solidity-coverage?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
[19]: https://badge.fury.io/js/solidity-coverage
[20]: https://circleci.com/gh/sc-forks/solidity-coverage
[21]: https://codecov.io/gh/sc-forks/solidity-coverage
[22]: https://cdn-images-1.medium.com/max/800/1*uum8t-31bUaa6dTRVVhj6w.png
[23]: https://github.com/sc-forks/solidity-coverage/blob/master/docs/advanced.md#workflow-hooks
[24]: https://github.com/sc-forks/solidity-coverage/blob/master/docs/advanced.md#skipping-tests
[25]: https://github.com/sc-forks/solidity-coverage/issues/417
[26]: https://hardhat.org/
[27]: https://www.trufflesuite.com/docs
[28]: https://github.com/sc-forks/solidity-coverage/blob/master/docs/api.md
[29]: https://github.com/sc-forks/solidity-coverage/blob/master/docs/upgrade.md#upgrading-from-06x-to-070
[30]: https://github.com/sc-forks/solidity-coverage/tree/0.6.x-final#solidity-coverage
[31]: https://github.com/sc-forks/solidity-coverage/releases/tag/v0.7.0
[32]: https://github.com/sc-forks/buidler-e2e/tree/coverage
[33]: https://github.com/sc-forks/moloch
[34]: https://github.com/sc-forks/solidity-coverage/blob/master/docs/advanced.md#reducing-the-instrumentation-footprint

