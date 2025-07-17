# @nomicfoundation/hardhat-foundry

## 1.2.0

### Minor Changes

- 14b3042: Updated the minimal supported version of Node to v20 ([#6982](https://github.com/NomicFoundation/hardhat/pull/6982))

## 1.1.4

### Patch Changes

- 52e2272: Fixed a bug in the `init-foundry` task that prevented it from being used with the latest versions of `forge`

## 1.1.3

### Patch Changes

- 7a383c9: Replace chalk with picocolor

## 1.1.2

### Patch Changes

- a93e240: Fixed an issue where paths were set as relative instead of absolute when overriding sources

## 1.1.1

### Patch Changes

- 8af824dfd: Bump hardhat-foundry's peer dependency on Hardhat

## 1.1.0

### Minor Changes

- 9cb4f845d: Revamped how remappings are handled. Now they are passed to Hardhat's compile task, which handles them during file resolution.

## 1.0.3

### Patch Changes

- 3bdc9d6bb: Fixed a bug related to remappings that use the node_modules directory

## 1.0.2

### Patch Changes

- c52470de5: Fixed a performance issue that was causing compilation to be much slower when `hardhat-foundry` was used

## 1.0.1

### Patch Changes

- af0f9c1d3: Fixed a bug in how the configured sources paths are compared (thanks @bingryan!)
