# @nomicfoundation/hardhat-viem

## 2.0.5

### Patch Changes

- 6010386: Moved types to `HardhatViemHelpers` and initialized `ContractTypesMap` as empty for better extensibility. Improved performance by disabling retries in dev nets (thanks @TateB!)

## 2.0.4

### Patch Changes

- efa905d: Fix for corrupted Hardhat peer dependency version from pnpm.

## 2.0.3

### Patch Changes

- a8a6038: Added `ContractTypesMap` to simplify contract type imports (thanks @beepidibop!)

## 2.0.2

### Patch Changes

- ccb0ace: Added support for library linking (thanks @Chlebamaticon!)

## 2.0.1

### Patch Changes

- a181462: Fix to add guard for updated `TransactionReceipt` type in `viem`

## 2.0.0

### Major Changes

- e4b1c07b7: Upgraded hardhat-viem to support viem@2

## 1.0.4

### Patch Changes

- 29516eb: Fixed broken link in network error message (thanks @sunsetlover36!).

## 1.0.3

### Patch Changes

- ffb301f14: Improved loading performance

## 1.0.2

### Patch Changes

- b521c2a05: Add configurable public client to getContractAt, deployContract and sendDeploymentTransaction

## 1.0.1

### Patch Changes

- 4943519d0: Fixed an issue with development networks using custom chain ids
