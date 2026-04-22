# @nomicfoundation/hardhat-ethers

## 4.0.9

### Patch Changes

- [#8179](https://github.com/NomicFoundation/hardhat/pull/8179) [`d16d82a`](https://github.com/NomicFoundation/hardhat/commit/d16d82abfd5c9fa044cb508468cd4b50a5fcfd8a) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Await all returned promises for better debuggability

- [#8153](https://github.com/NomicFoundation/hardhat/pull/8153) [`e21950e`](https://github.com/NomicFoundation/hardhat/commit/e21950e68dbd778ce0c4cfcad8c71dfeb4f9cad1) Thanks [@schaable](https://github.com/schaable)! - Fix gas config fields (gas, gasMultiplier, gasPrice) not being applied when sending transactions through the HardhatEthersSigner

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.0.4

## 4.0.8

### Patch Changes

- [#8104](https://github.com/NomicFoundation/hardhat/pull/8104) [`e27a7ad`](https://github.com/NomicFoundation/hardhat/commit/e27a7ad584b01392afc9294f739d731ab6e78f06) Thanks [@ChristopherDedominici](https://github.com/ChristopherDedominici)! - Use code 3 for JSON-RPC revert error codes to align with standard node behavior and preserve error causes in viem/ethers.

- [#8096](https://github.com/NomicFoundation/hardhat/pull/8096) [`7fb721b`](https://github.com/NomicFoundation/hardhat/commit/7fb721bb2b1c521d0073a156f361c60a049e8fdf) Thanks [@alcuadrado](https://github.com/alcuadrado)! - [chore] Move to packages/ folder.

- [#8116](https://github.com/NomicFoundation/hardhat/pull/8116) [`88787e1`](https://github.com/NomicFoundation/hardhat/commit/88787e172a3d90652d0ffaf73e31857f6ed875cc) Thanks [@kanej](https://github.com/kanej)! - Deprecate the `hre.network.connect()` method in favour of `hre.network.create()`, exactly the same method but more clearly indicating that it will create a new connection.

- Updated dependencies:
  - hardhat@3.4.0
  - @nomicfoundation/hardhat-errors@3.0.11
  - @nomicfoundation/hardhat-utils@4.0.3

## 4.0.7

### Patch Changes

- [#7997](https://github.com/NomicFoundation/hardhat/pull/7997) [`df7f24a`](https://github.com/NomicFoundation/hardhat/commit/df7f24a27d01c5b49379c7a1b12b507d734395d7) Thanks [@ChristopherDedominici](https://github.com/ChristopherDedominici)! - Added `HardhatEthersProvider.waitForTransaction` to provide polling support for `non-automining` networks ([#7952](https://github.com/NomicFoundation/hardhat/issues/7952)).

- [#8088](https://github.com/NomicFoundation/hardhat/pull/8088) [`23c0d36`](https://github.com/NomicFoundation/hardhat/commit/23c0d3658f29305bf0adbbce4644a54d7ef22550) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Optimize imports.

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.0.2
  - @nomicfoundation/hardhat-errors@3.0.10

## 4.0.6

### Patch Changes

- bc193be: Use concrete value types for contract names in hardhat-viem and hardhat-ethers

## 4.0.5

### Patch Changes

- 6674b00: Bump `hardhat-utils` major

## 4.0.4

### Patch Changes

- 5abcee6: Use Osaka as the default EVM target for solc 0.8.31+ and increase the gas limit per EIP-7935. Thanks @Amxx! ([#7813](https://github.com/NomicFoundation/hardhat/pull/7813))

## 4.0.3

### Patch Changes

- 558ac5b: Update installation and config instructions

## 4.0.2

### Patch Changes

- 138d673: Added `network.createServer(...)` to spawn a Hardhat node programmatically ([#6472](https://github.com/NomicFoundation/hardhat/issues/6472))

## 4.0.1

### Patch Changes

- 27d52b7: Fixed index resolution in clearEventListeners ([#7359](https://github.com/NomicFoundation/hardhat/pull/7359))

## 4.0.0

### Major Changes

- 29cc141: First release of Hardhat 3!

## 3.1.0

### Minor Changes

- 14b3042: Updated the minimal supported version of Node to v20 ([#6982](https://github.com/NomicFoundation/hardhat/pull/6982))

## 3.0.9

### Patch Changes

- d77ecab: Update ethers to v6.14.0 with Pectra support

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
