---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/ItsNickBarry/hardhat-log-remover/tree/master)
:::

# Hardhat Log Remover

Remove Hardhat `console.log` imports and calls from Solidity source code.

This plugin is intended in part to keep version-controlled code free of log statements.  To remove logs from compiled contracts while preserving them in source code, see [hardhat-preprocessor](https://github.com/wighawag/hardhat-preprocessor).

> Versions of this plugin prior to `2.0.0` were released as `buidler-log-remover`.

## Installation

```bash
yarn add --dev hardhat-log-remover
```

## Usage

Load plugin in Hardhat config:

```javascript
require('hardhat-log-remover');
```

Run the Hardhat task manually:

```bash
yarn run hardhat remove-logs
```

Before removing logs, the plugin will ensure that all contracts can be compiled successfully.

## Testing

Run the unit tests with Mocha:

```bash
yarn run mocha
```
