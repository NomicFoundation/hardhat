---
editLink: false
---


::: tip External Plugin
This is a third-party plugin. Please report issues in its [Github Repository](https://github.com/ItsNickBarry/hardhat-docgen/tree/master)
:::

# Hardhat Docgen

Generate a static documentation site from NatSpec comments automatically on compilation with Hardhat.

## Installation

```bash
yarn add --dev hardhat-docgen
```

## Usage

Load plugin in Hardhat config:

```javascript
require('hardhat-docgen');
```

Add configuration under the `docgen` key:

| option | description | default |
|-|-|-|
| `path` | path to HTML export directory (relative to Hardhat root) | `'./docgen'`
| `clear` | whether to delete old files in `path` on documentation generation  | `false` |
| `runOnCompile` | whether to automatically generate documentation during compilation | `false` |
| `only` | `Array` of `String` matchers used to select included contracts, defaults to all contracts if `length` is 0 | `['^contracts/']` (dependent on Hardhat `paths` configuration) |
| `except` | `Array` of `String` matchers used to exclude contracts | `[]` |

```javascript
docgen: {
  path: './docs',
  clear: true,
  runOnCompile: true,
}
```

The `path` directory will be created if it does not exist.

The `clear` option is set to `false` by default because it represents a destructive action, but should be set to `true` in most cases.

The included Hardhat task may be run manually; however, it is imperative that the `compile` task be run at least once after plugin installation to ensure that the correct compiler options are set:

```bash
yarn run hardhat docgen
```
