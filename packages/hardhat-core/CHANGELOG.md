# hardhat

## 2.6.8

### Patch Changes

- f35f3548: Add support for the `personal_sign RPC method to Hardhat Network.
- 692b9130: Throw an error for solc versions older than 0.4.11
- 4df2df4d: Add a new `hardhat_getAutomine` JSON-RPC method to Hardhat Network that returns `true` if automining is enabled and `false` if it's not.
- 91edb2aa: Add support for Solidity 0.8.7.
- c501e1ec: Added support for Solidity 0.8.6.
- 4ccd1f72: Enable solc's metadata by default (Thanks @chriseth!)
- 4f102576: Support Solidity 0.8.9
- 12158a06: Added support for Solidity 0.8.8
- 4c7fe24e: Add support for Solidity 0.8.5.
- d00a1a71: Print a warning in the node task if the default accounts are used.

## 2.6.7

### Patch Changes

- c2ab8198: Upgrade @solidity-parser/parser (fixes #1801)
- 3032c374: Fix `eth_feeHistory` computation (issue #1848)

## 2.6.6

### Patch Changes

- 09415141: Work around an issue that broke Hardhat Network when contracts were compiled in the middle of its execution

## 2.6.5

### Patch Changes

- e29e14c7: Add Advanced Sample Project that uses TypeScript.
- a00345ca: Small improvements to the advanced sample project.

## 2.6.4

### Patch Changes

- b62ddf32: Fix a bug in Hardhat Network's solidity source maps processing. Thanks @paulberg!

## 2.6.3

### Patch Changes

- c4b32d7d: Fix a bug that prevented Hardhat Network's tracing engine from working if an interface was used as a mapping key (Thanks @k06a!)

## 2.6.2

### Patch Changes

- abc380ce: Fix issue with networks that support `eth_feeHistory` but that don't support EIP-1559 (#1828).
