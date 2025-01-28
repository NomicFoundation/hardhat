# @nomiclabs/hardhat-vyper

## 3.0.8

### Patch Changes

- efa905d: Fix for corrupted Hardhat peer dependency version from pnpm.

## 3.0.7

### Patch Changes

- 1f9f8e0: Support Vyper 0.4.0's new output identifiers (Thanks, @kiriyaga-txfusion!)

## 3.0.6

### Patch Changes

- f0e6389: Added support for vyper settings 'evmVersion' and 'optimize'

## 3.0.5

### Patch Changes

- 2f73386b1: Fixed a problem with the Vyper compilers downloader

## 3.0.4

### Patch Changes

- 03745576c: Added a check to validate that the Brownie code does not contain the directive `#@ if mode == "test":` because we do not support this feature.

## 3.0.3

### Patch Changes

- a7e70047e: Keep the parent exception when throwing because the compiler list download failed.
- 5231d38f4: Use our mirror to download Vyper releases, which should be more stable

## 3.0.2

### Patch Changes

- 7e81377fc: Fix vyper compiler download timeouts

## 3.0.1

### Patch Changes

- 2e9df3d73: The gas field is not included in the artifacts's ABI anymore (thanks @MarkuSchick).
- 2922b15f5: Improve the compilation performance by not using the `glob` library whenever we can avoid it.

## 3.0.0

### Major Changes

- 9b1de8e0: Full rework of vyper plugin (#2082, #1364, #1338, #1335, #1258)
