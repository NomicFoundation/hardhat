[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-solpp.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-solpp)
 [![Build Status](https://travis-ci.com/nomiclabs/buidler-solpp.svg?branch=master)](https://travis-ci.com/nomiclabs/buidler-solpp)


# buidler-solpp
[Buidler](http://getbuidler.com) plugin for integration with solpp preprocessor.

## What
This plugin hooks into the compilation pipeline and run the solpp preprocessor.

## Installation
```
npm install @nomiclabs/buidler-solpp
```

And add the following require to the top of your ```buidler.config.js```:

```require("@nomiclabs/buidler-solpp")```

## Tasks
This plugin creates the task ```solpp``` and overrides the ```compile:get-source-paths```.

The task ```solpp``` receives an array of files and the solpp config options and it does the actual preprocessing.

The ```compile:get-source-paths``` task is part of the compilation pipeline and it will be executed everytime you compile your contracts with buidler.


## Environment extensions
This plugin does not extend the environment.

## Usage
There are no additional steps you need to take for this plugin to work. Install it, run `npx buidler compile` and solc will compile the solpp generated contracts, which they will be in ```cache/solpp-generated-contracts```.