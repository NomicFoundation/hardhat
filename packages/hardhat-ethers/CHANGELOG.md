# @nomiclabs/hardhat-ethers

## 3.0.8

### Patch Changes

- efa905d: Fix for corrupted Hardhat peer dependency version from pnpm.

## 3.0.7

### Patch Changes

- 93b30d5: Fix for `getSigners` against networks where `eth_accounts` is deprecated.

## 3.0.6

### Patch Changes

- 55924a7: Fixed a race condition in our ethers provider
- 1d43aba: Updated the max fee per gas calculation to use `eth_maxPriorityFeePerGas` when available

## 3.0.5

### Patch Changes

- ebe5a5fe3: Added support for passing bigints as block tags

## 3.0.4

### Patch Changes

- 487cd4a81: Reduced the load time of the plugin
- 84283d119: Fixed two issues related to `contract.on` (https://github.com/NomicFoundation/hardhat/issues/4098). The first one was about events with indexed arguments not being handled correctly. The second one was related to transactions that emitted the same event twice or more.

## 3.0.3

### Patch Changes

- a1e37a40b: Added support for listening for events with `contract.on`

## 3.0.2

### Patch Changes

- eb1ae069b: Fixed a problem when `waitForDeployment` was used in live networks.

## 3.0.1

### Patch Changes

- a9c159f96: The `helper.deployContract` now accepts transaction overrides

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
