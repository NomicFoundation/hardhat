# @nomiclabs/hardhat-ethers

## 2.2.3

### Patch Changes

- 6dccd2915: Make getContractFactory's params validation more flexible.

## 2.2.2

### Patch Changes

- 7e013fa19: Upgrade undici

## 2.2.1

### Patch Changes

- 136f25a9e: `getContractAt` doesn't throw anymore if the given address is not a contract.

## 2.2.0

### Minor Changes

- f0310ec91: Add a `deployContract` helper

## 2.1.1

### Patch Changes

- fa2a98c8a: getContractAt() now throws an error if the address is not of a contract.

## 2.1.0

### Minor Changes

- 0d4a68043: Added new helper `getImpersonatedSigner()`, a shorthand for invoking the `hardhat_impersonateAccount` JSON-RPC method followed immediately by `ethers.getSigner()`.

## 2.0.6

### Patch Changes

- 7403ec1d: Stop publishing tsconfig.json files

## 2.0.5

### Patch Changes

- 1de2a228: Fix an issue that was causing typescript projects to also compile Hardhat's source (#2260).

## 2.0.4

### Patch Changes

- 6afeeffe: Add equivalents in hardhat-ethers for `getContractFactory` and `getContractAt` that support passing `Artifact`, specifically `getContractFactoryFromArtifact` and `getContractAtFromArtifact` (issue #1716)

## 2.0.3

### Patch Changes

- def9cbb2: Reset the hardhat-ethers provider when a snapshot is reverted (issue #1247)
- 571ef80d: Adds a custom formatter to better display BigNumber's in Hardhat console (issue #2109).
