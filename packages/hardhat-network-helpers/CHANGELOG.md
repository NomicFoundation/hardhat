# @nomicfoundation/hardhat-network-helpers

## 1.0.12

### Patch Changes

- 8fa15e7: Add support for ZKsync's development mode

## 1.0.11

### Patch Changes

- 8be0c2c: Improve an error message and add a utility to clear all the existing snaphosts.

## 1.0.10

### Patch Changes

- 43d75470c: Added support for using network helpers on anvil network (thanks @tmigone!)

## 1.0.9

### Patch Changes

- 9715d4195: Added support for receiving Date instances in `increaseTo` network helper (thanks @Saty248)

## 1.0.8

### Patch Changes

- e443b3667: Added an option in Hardhat Network to allow mining blocks with the same timestamp
- 8a4ad9ddc: Added a new 'reset' network helper

## 1.0.7

### Patch Changes

- 15b8b61f6: Fixed an error triggered by certain combinations of `loadFixture` calls (#3249, thanks @skosito!)

## 1.0.6

### Patch Changes

- 89f153a72: Fix `setStorageAt` so it can accept multiple leading zeros in the slot

## 1.0.5

### Patch Changes

- f3ba15ca8: Added a new `setPrevRandao` helper

## 1.0.4

### Patch Changes

- 4dddc5370: Fix peer dependency on `hardhat` to pull in `hardhat/common`

## 1.0.3

### Patch Changes

- d9fb21a5b: - Disallow using anonymous functions as fixtures
