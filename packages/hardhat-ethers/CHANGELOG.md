# @nomiclabs/hardhat-ethers

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
