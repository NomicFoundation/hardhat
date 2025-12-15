# @nomicfoundation/hardhat-toolbox

## 6.1.2

### Patch Changes

- a7e4215: Update `solidity-coverage` minimum version to include Osaka changes

## 6.1.1

### Patch Changes

- 9d10226: Links in the code and READMEs updated to point to the Hardhat 2 documentation and resources
- dc7ff8c: Fix `REPORT_GAS` envvar in toolboxes (https://github.com/NomicFoundation/hardhat/pull/7367)

## 6.1.0

### Minor Changes

- 14b3042: Updated the minimal supported version of Node to v20 ([#6982](https://github.com/NomicFoundation/hardhat/pull/6982))

## 6.0.0

### Major Changes

- 94b36b0: Upgrade hardhat-gas-reporter to v2 on both toolboxes ([#6886](https://github.com/NomicFoundation/hardhat/pull/6886))

## 5.0.0

### Major Changes

- 92d140f: Include Hardhat Ignition in the toolboxes.

### Patch Changes

- Updated dependencies [92d140f]

## 4.0.0

### Major Changes

- 23665f399: Upgraded typechain and hardhat-verify dependencies

## 3.0.0

### Major Changes

- 399347f40: The Toolbox and the plugins that it includes are now based on ethers v6

## 2.0.2

### Patch Changes

- 50779cd10: Added support for writing scripts and tests as ES modules.

  To learn how to start using ESM with Hardhat read [this guide](https://v2.hardhat.org/hardhat-runner/docs/advanced/using-esm).

## 2.0.1

### Patch Changes

- 10a928c4c: Upgraded mocha and @types/mocha dependencies in Hardhat and Hardhat Toolbox

## 2.0.0

### Major Changes

- 7aca6744d: Upgraded `solidity-coverage` to the latest version. Since this new version includes some breaking changes, we are bumping the Toolbox to a new major version.

## 1.0.2

### Patch Changes

- a5324f4f8: Fix a bug in the hardhat-gas-reporter config resolution
