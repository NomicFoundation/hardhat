---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/ItsNickBarry/hardhat-spdx-license-identifier/tree/master)
:::

# Hardhat SPDX License Identifer

Prepend Solidity source files in Hardhat projects with the SPDX License Identifier specified in `package.json`.

> Versions of this plugin prior to `2.0.0` were released as `buidler-spdx-license-identifier`.

## Installation

```bash
yarn add --dev hardhat-spdx-license-identifier
```

## Usage

Load plugin in Hardhat config:

```javascript
require('hardhat-spdx-license-identifier');
```

Add configuration under the `spdxLicenseIdentifier` key:

| option | description | default |
|-|-|-|
| `overwrite` | whether to overwrite existing SPDX license identifiers | `false` |
| `runOnCompile` | whether to automatically prepend identifiers during compilation | `false` |

```javascript
spdxLicenseIdentifier: {
  overwrite: true,
  runOnCompile: true,
}
```

The included Hardhat task may be run manually:

```bash
yarn run hardhat prepend-spdx-license
```

Files which do not contain a license identifier will be prepended with one.  Files with a license identifier which does not match that which is specified in `package.json` may be updated, depending on configuration.
