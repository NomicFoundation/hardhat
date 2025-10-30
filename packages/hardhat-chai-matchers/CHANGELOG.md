# @nomicfoundation/hardhat-chai-matchers

## 2.1.2

### Patch Changes

- 8da8c38: Update README installation instructions to point to the Hardhat 2 tag: `hh2` ([#7636](https://github.com/NomicFoundation/hardhat/pull/7636))

## 2.1.1

### Patch Changes

- 9d10226: Links in the code and READMEs updated to point to the Hardhat 2 documentation and resources

## 2.1.0

### Minor Changes

- 14b3042: Updated the minimal supported version of Node to v20 ([#6982](https://github.com/NomicFoundation/hardhat/pull/6982))

## 2.0.9

### Patch Changes

- d77ecab: Update ethers to v6.14.0 with Pectra support

## 2.0.8

### Patch Changes

- 1a0e1e3: Enhanced error message in `.emit` matcher for overloaded events (thanks @iosh!)
- 7964bf0: Enhanced the `reverted` matcher to correctly handle `bytes32` strings (thanks @iosh!)

## 2.0.7

### Patch Changes

- ac55f40: Accept predicate functions in the `changeEtherBalance`, `changeEthersBalances`, `changeTokenBalance` and `changeTokenBalances` matchers (thanks @SevenSwen and @k06a!)

## 2.0.6

### Patch Changes

- 69fc3a4: Improved error messages of the `.withArgs` matcher (thanks @RenanSouza2!)

## 2.0.5

### Patch Changes

- 72bf9f6: Added support for Typed objects (thanks @RenanSouza2!)
- 82bc59d: Improved how `.revertedWithCustomError` handles wrong number of arguments (thanks @RenanSouza2!)

## 2.0.4

### Patch Changes

- ffb301f14: Improved loading performance

## 2.0.3

### Patch Changes

- dff8302aa: Added support for `Addressable` objects in `.withArgs` and `.equals` (thanks @Amxx!)

## 2.0.2

### Patch Changes

- f324b3a33: Forbid chaining incompatible chai matchers

## 2.0.1

### Patch Changes

- 70c2ccf12: Removed an unnecessary dependency

## 2.0.0

### Major Changes

- 523235b83: Added support for ethers v6

### Patch Changes

- 06c4797a7: Fixed a problem when `.withArgs` was used with arrays with different length

## 1.0.6

### Patch Changes

- 8fa00c97c: Improved the warning shown when both `@nomicfoundation/hardhat-chai-matchers` and `@nomiclabs/hardhat-waffle` are used.

## 1.0.5

### Patch Changes

- 478c244a7: The `revertedWith` matcher now supports regular expressions (thanks @Dkdaniz!)

## 1.0.4

### Patch Changes

- 691f0cecb: Fixed the values matched by `properAddress` and `properPrivateKey` (thanks @olehmisar!)

## 1.0.3

### Patch Changes

- 616a78617: Failed assertions now show a more useful stack trace

## 1.0.2

### Patch Changes

- 857a56069: Fixed a bug where `changeTokenBalances` was sending the tx multiple times when used with a callback

## 1.0.1

### Patch Changes

- ed6222bf1: Fix an error in revertedWithCustomError's argument matching
