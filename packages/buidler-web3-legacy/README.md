# Buidler Web3 Legacy Plugin

This plugin integrates [Web3.js](https://github.com/ethereum/web3.js) `0.20x` into [Buidler](http://getbuidler.com).

# Installation

To install this plugin follow these steps:

1. Install it in your Buidler project with `npm install @nomiclabs/buidler-plugin-web3`
2. Install Web3.js with `npm install web3@^0.20.7`
3. Import the plugin in your `buidler.config.js` by adding `require("@nomiclabs/buidler-web3-legacy")`

# How to use it

This plugin adds the following elements to the `BuidlerRuntimeEnvironment`:

* `Web3`: The Web3.js module.
* `web3`: An instantiated Web3.js object connected to the selected network.
* `pweb3`: A promisified version of `web3`.
