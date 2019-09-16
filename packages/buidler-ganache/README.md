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
This plugin adds all ganache running configs (defaults and set by the config file) to the BRE.
The default ganache options exposed are:
```js
defaultOptions = {
    url: "http://127.0.0.1:8545",
    gasPrice: 20000000000,
    gasLimit: 6721975,
    defaultBalanceEther: 100,
    totalAccounts: 10,
    hardfork: "petersburg",
    allowUnlimitedContractSize: false,
    locked: false,
    hdPath: "m/44'/60'/0'/0/",
    keepAliveTimeout: 5000
}
```  


## Usage
There are no additional steps you need to take for this plugin to work.

## Configuration
Any configuration is optional. But here it's an example that you can ass to your `buidler.config.js` file.
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
Here the list of all available options and constrains: [ganache-core options](https://github.com/trufflesuite/ganache-core#options).
###
Note: The `accounts` option it's not currently supported.
