# buidler-web3

This plugin integrates [Web3.js](https://github.com/ethereum/web3.js) `1.x` into [Buidler](http://getbuidler.com). Tested against Web3@1.0.0-beta.37.

## What
This plugin brings to Buidler the Web3 module and an initialized instance of Web3.

# Installation
To install this plugin follow these steps:

1. Install it in your Buidler project with `npm install @nomiclabs/buidler-web3`
2. Install Web3.js with `npm install web3@1.0.0-beta.37`
3. Import the plugin in your `buidler.config.js` by adding `require("@nomiclabs/buidler-web3")`

## Tasks
This plugin creates no additional tasks.

## Environment extensions
This plugin adds the following elements to the `BuidlerRuntimeEnvironment`:

* `Web3`: The Web3.js module.
* `web3`: An instantiated Web3.js object connected to the selected network.
