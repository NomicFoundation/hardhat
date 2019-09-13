[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-ethers.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-ethers)

# buidler-ganache
[Buidler](http://getbuidler.com) plugin to launch [ganache-core](https://github.com/trufflesuite/ganache-core) before running tests or run tasks.

## What
This plugin hooks into the `TASK_TEST`/`TASK_RUN` pipeline to start ganache-cli before anything and stop it afterwards.

## Installation
```bash
npm install @nomiclabs/buidler-ganache ganache-cli
```

And add the following statement to your `buidler.config.js`:
```js
usePlugin("@nomiclabs/buidler-ganache");
```

## Tasks
This plugin creates no additional tasks.

## Environment extensions
This plugin adds all ganache running configs (defaults and set by the config file) to `.

## Usage
There are no additional steps you need to take for this plugin to work.

## Configuration
Configuration is optional.
```js
module.exports = {
    defaultNetwork: "ganache",
    networks: {
        ganache: {
            url: "http://127.0.0.1:8555",
            gasPrice: 20000000000,
            gasLimit: 6000000000,
            defaultBalanceEther: 10,
            totalAccounts: 3,
            mnemonic: "polar velvet stereo oval echo senior cause cruel tube hobby exact angry",
        },
    }
};
```
:bulb: **Pro Tip**

The options include an `enabled` key that lets you toggle gas reporting on and off using shell
environment variables. When `enabled` is false, mocha's (faster) default spec reporter is used.
Example:

```js
module.exports = {
  gasReporter: {
    enabled: (process.env.REPORT_GAS) ? true : false
  }
}
```
