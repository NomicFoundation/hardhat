[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-ethers.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-ethers)
 [![Build Status](https://travis-ci.com/nomiclabs/buidler-ethers.svg?branch=master)](https://travis-ci.com/nomiclabs/buidler-ethers)


# buidler-ethers
[Buidler](http://getbuidler.com) plugin for integration with [ethers.js](https://github.com/ethers-io/ethers.js/).

## What
This plugin brings to Buidler the Ethereum library ethers.js, which allows you to interact with the Ethereum blockchain in a simple way.

## Installation
```npm install @nomiclabs/buidler-ethers ethers@^4.0.23```

And add the following require to the top of your ```buidler.config.js```:

```require("@nomiclabs/buidler-ethers")```

## Tasks
This plugin creates no additional tasks.

## Environment extensions
An initialized `ethers` object is injected into the environment:
```
ethers: {
  provider: JsonRpcProvider;
  getContract: (name: string) => Promise<ContractFactory>;
  signers: () => Promise<Signer[]>;
};
```

The `ContractFactory` in `getContract` is connected by default to the signer `0` in `env.ethers.signers`.

## Usage
There are no additional steps you need to take for this plugin to work. Install it and access ethers through the environment anywhere you need it (tasks, scripts, tests, etc).
