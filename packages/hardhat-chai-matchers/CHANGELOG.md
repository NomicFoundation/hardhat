# @nomicfoundation/hardhat-chai-matchers

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
