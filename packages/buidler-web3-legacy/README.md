[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-web3-legacy.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-web3-legacy)
 [![Build Status](https://travis-ci.com/nomiclabs/buidler-web3-legacy.svg?branch=master)](https://travis-ci.com/nomiclabs/buidler-web3-legacy)
 
# buidler-web3-legacy

This plugin integrates [Web3.js](https://github.com/ethereum/web3.js) `0.20x` into [Buidler](http://getbuidler.com).

## What
This plugin brings to Buidler the Web3 module and an initialized instance of Web3.

# Installation
To install this plugin follow these steps:

1. Install it in your Buidler project with `npm install @nomiclabs/buidler-web3-legacy`
2. Install Web3.js with `npm install web3@^0.20.7`
3. Import the plugin in your `buidler.config.js` by adding `require("@nomiclabs/buidler-web3-legacy")`

## Tasks
This plugin creates no additional tasks.

## Environment extensions
This plugin adds the following elements to the `BuidlerRuntimeEnvironment`:

* `Web3`: The Web3.js module.
* `web3`: An instantiated Web3.js object connected to the selected network.
* `pweb3`: A promisified version of `web3`.
