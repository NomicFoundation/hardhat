---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/ItsNickBarry/hardhat-contract-sizer/tree/master)
:::

# Hardhat Contract Sizer

Output Solidity contract sizes with Hardhat.

> Versions of this plugin prior to `2.0.0` were released as `buidler-contract-sizer`.

## Installation

```bash
yarn add --dev hardhat-contract-sizer
```

## Usage

Load plugin in Hardhat config:

```javascript
require('hardhat-contract-sizer');
```

Add configuration under the `contractSizer` key:

| option | description | default |
|-|-|-|
| `alphaSort` | whether to sort results table alphabetically (default sort is by contract size) | `false`
| `runOnCompile` | whether to output contract sizes automatically after compilation | `false` |
| `disambiguatePaths` | whether to output the full path to the compilation artifact (relative to the Hardhat root directory) | `false` |

```javascript
contractSizer: {
  alphaSort: true,
  runOnCompile: true,
  disambiguatePaths: false,
}
```

Run the included Hardhat task to output compiled contract sizes:

```bash
yarn run hardhat size-contracts
```
