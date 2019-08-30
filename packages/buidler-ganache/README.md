[![npm](https://img.shields.io/npm/v/@nomiclabs/buidler-ethers.svg)](https://www.npmjs.com/package/@nomiclabs/buidler-ethers)

# buidler-ganache
[Buidler](http://getbuidler.com) plugin to launch [ganache-cli](https://github.com/trufflesuite/ganache-cli) before running tests or tasks.

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
This plugin does not extend the environment.

## Usage
There are no additional steps you need to take for this plugin to work.

## Configuration
There's no extra configuration for this plugin.
