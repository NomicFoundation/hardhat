# @nomicfoundation/hardhat-mocha

## 3.0.8

### Patch Changes

- 3667ecd: Fixed `hardhat-mocha` dependencies by moving `hardhat` and `mocha` to `peerDependencies` ([#7519](https://github.com/NomicFoundation/hardhat/issues/7519))

## 3.0.7

### Patch Changes

- 147f8a6: Improved the look and feel of compilation output ([#7669](https://github.com/NomicFoundation/hardhat/pull/7669))

## 3.0.6

### Patch Changes

- 558ac5b: Update installation and config instructions

## 3.0.5

### Patch Changes

- d1969e7: Added support for showing gas statistics after running nodejs tests ([#7472](https://github.com/NomicFoundation/hardhat/issues/7428)).
- 5e64246: Improved JS/TS test tasks to not compile Solidity tests ([#7626](https://github.com/NomicFoundation/hardhat/pull/7626))

## 3.0.4

### Patch Changes

- 0ee442d: All test runners now set NODE_ENV to "test" in case it is not set before the tests start ([#7511](https://github.com/NomicFoundation/hardhat/issues/7511))

## 3.0.3

### Patch Changes

- 0fb6d34: Show error message on unawaited async expectations ([#7321](https://github.com/NomicFoundation/hardhat/issues/7321))

## 3.0.2

### Patch Changes

- 49cc9ba: Load resolved global options into environment variables during tests ([#7305](https://github.com/NomicFoundation/hardhat/pull/7305))

## 3.0.1

### Patch Changes

- d45d544: Fixed passing global network options to node:test and mocha subprocesses ([#7248](https://github.com/NomicFoundation/hardhat/issues/7248))
- d45d544: Fixed collecting coverage from parallel mocha test runs

## 3.0.0

### Major Changes

- 29cc141: First release of Hardhat 3!
