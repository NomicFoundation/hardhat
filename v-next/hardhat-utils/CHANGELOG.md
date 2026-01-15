# @nomicfoundation/hardhat-utils

## 3.0.6

### Patch Changes

- 2bc18b2: Bumped `viem` version across all packages [7861](https://github.com/NomicFoundation/hardhat/pull/7861).

## 3.0.5

### Patch Changes

- d45234d: Fixed Etherscan verification failures by removing hardcoded v1 API URLs from chain descriptors ([#7623](https://github.com/NomicFoundation/hardhat/issues/7623)). Also enhanced config resolution to support partial overrides in block explorer configurations for future extensibility.

## 3.0.4

### Patch Changes

- d1969e7: Added support for showing gas statistics after running nodejs tests ([#7472](https://github.com/NomicFoundation/hardhat/issues/7428)).

## 3.0.3

### Patch Changes

- d821a0a: Fix npm artifact cleanup on windows ([#7459](https://github.com/NomicFoundation/hardhat/issues/7459))
- b13620a: Add compilation progress spinner to show build progress ([#7460](https://github.com/NomicFoundation/hardhat/pull/7460))

## 3.0.2

### Patch Changes

- 8c1cb1e: Fixed peer dependencies for Hardhat so `rpc` utils can be loaded ([#7415](https://github.com/NomicFoundation/hardhat/issues/7415))

## 3.0.1

### Patch Changes

- 49cc9ba: Load resolved global options into environment variables during tests ([#7305](https://github.com/NomicFoundation/hardhat/pull/7305))
- 8d3b16c: Support for custom compilers ([#7130](https://github.com/NomicFoundation/hardhat/issues/7130))
- a475780: Added automatic proxy detection for `hardhat-verify` and fixed case-insensitive proxy environment variables for network requests ([#7407](https://github.com/NomicFoundation/hardhat/pull/7407))

## 3.0.0

### Major Changes

- 29cc141: First release of Hardhat 3!
