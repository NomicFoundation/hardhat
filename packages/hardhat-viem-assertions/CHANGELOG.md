# @nomicfoundation/hardhat-viem-assertions

## 3.1.0

### Minor Changes

- [#8329](https://github.com/NomicFoundation/hardhat/pull/8329) [`02fc7fb`](https://github.com/NomicFoundation/hardhat/commit/02fc7fb4e1d9883dc1158ae5172a10f6af6cc5be) Thanks [@alcuadrado](https://github.com/alcuadrado)! - The assertions `balancesHaveChanged`, `emit`, and `emitWithArgs` now accept either a promise or its already-awaited value, so `await contract.write.foo()` can be passed directly.

  `emit` and `emitWithArgs` now only look at logs produced by the specific transaction passed in (via its receipt) instead of every log ever emitted by the contract address. Tests that previously passed by matching events from other transactions on the same contract will now correctly fail.

  The `contractFn` parameter of `emit` and `emitWithArgs` has been narrowed accordingly: it no longer accepts `ReadContractReturnType` (reads don't produce a receipt). Existing code passing a read result was already a no-op against the contract's logs and would not have produced a meaningful assertion.

### Patch Changes

- [#8313](https://github.com/NomicFoundation/hardhat/pull/8313) [`f1663f7`](https://github.com/NomicFoundation/hardhat/commit/f1663f7aa95a9e7490996527f2f8e9a3e9c8b1c7) Thanks [@0xAxiom](https://github.com/0xAxiom)! - Compare addresses case-insensitively in withArgs / revertWithCustomErrorWithArgs

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.1.3
  - @nomicfoundation/hardhat-errors@3.0.14

## 3.0.13

### Patch Changes

- [#8323](https://github.com/NomicFoundation/hardhat/pull/8323) [`ac172b5`](https://github.com/NomicFoundation/hardhat/commit/ac172b557ef283d4156cc617e911b481de48c67b) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Fix an error in revertWithCustomErrorWithArgs

## 3.0.12

### Patch Changes

- [#8264](https://github.com/NomicFoundation/hardhat/pull/8264) [`8452f97`](https://github.com/NomicFoundation/hardhat/commit/8452f9726205540e1684d3f8458bfd145e790226) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Export `./package.json` so consumers can import the package's manifest.

- Updated dependencies:
  - @nomicfoundation/hardhat-errors@3.0.13
  - @nomicfoundation/hardhat-utils@4.1.2

## 3.0.11

### Patch Changes

- [#8225](https://github.com/NomicFoundation/hardhat/pull/8225) [`19e2644`](https://github.com/NomicFoundation/hardhat/commit/19e26448ddb8f8ee1100b99a79f303aac5c118b2) Thanks [@lsheva](https://github.com/lsheva)! - Type-narrow event and custom-error assertions from the contract's ABI: `emit` / `emitWithArgs` / `revertWithCustomError` / `revertWithCustomErrorWithArgs` now infer event/error names from `contract.abi` (with autocomplete), and `expectedArgs` is typed as the matching input tuple. Each position can also be a `(value) => boolean` predicate.

- [#8191](https://github.com/NomicFoundation/hardhat/pull/8191) [`2a4ae8e`](https://github.com/NomicFoundation/hardhat/commit/2a4ae8e7dc78cabbe8b17bec778952f0124f9759) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Update how type extensions are handled to optimize the bootstrap process of Hardhat.

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.1.1

## 3.0.10

### Patch Changes

- [#8223](https://github.com/NomicFoundation/hardhat/pull/8223) [`9e94b25`](https://github.com/NomicFoundation/hardhat/commit/9e94b257eb8fee2cb57b8c12ee67b6517b556286) Thanks [@lsheva](https://github.com/lsheva)! - Fix `emit` and `emitWithArgs` leaking the underlying transaction into the next test when the synchronous ABI shape check failed. These helpers now always settle `contractFn` before any assertion can throw.

## 3.0.9

### Patch Changes

- [#8179](https://github.com/NomicFoundation/hardhat/pull/8179) [`d16d82a`](https://github.com/NomicFoundation/hardhat/commit/d16d82abfd5c9fa044cb508468cd4b50a5fcfd8a) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Await all returned promises for better debuggability

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.0.4

## 3.0.8

### Patch Changes

- [#8104](https://github.com/NomicFoundation/hardhat/pull/8104) [`e27a7ad`](https://github.com/NomicFoundation/hardhat/commit/e27a7ad584b01392afc9294f739d731ab6e78f06) Thanks [@ChristopherDedominici](https://github.com/ChristopherDedominici)! - Use code 3 for JSON-RPC revert error codes to align with standard node behavior and preserve error causes in viem/ethers.

- [#8096](https://github.com/NomicFoundation/hardhat/pull/8096) [`7fb721b`](https://github.com/NomicFoundation/hardhat/commit/7fb721bb2b1c521d0073a156f361c60a049e8fdf) Thanks [@alcuadrado](https://github.com/alcuadrado)! - [chore] Move to packages/ folder.

- [#8116](https://github.com/NomicFoundation/hardhat/pull/8116) [`88787e1`](https://github.com/NomicFoundation/hardhat/commit/88787e172a3d90652d0ffaf73e31857f6ed875cc) Thanks [@kanej](https://github.com/kanej)! - Deprecate the `hre.network.connect()` method in favour of `hre.network.create()`, exactly the same method but more clearly indicating that it will create a new connection.

- Updated dependencies:
  - hardhat@3.4.0
  - @nomicfoundation/hardhat-errors@3.0.11
  - @nomicfoundation/hardhat-utils@4.0.3

## 3.0.7

### Patch Changes

- 13918b4: Add support for custom chains not in viem's built-in chain list, thanks @daanporon! ([#7763](https://github.com/NomicFoundation/hardhat/issues/7763))

## 3.0.6

### Patch Changes

- 6674b00: Bump `hardhat-utils` major

## 3.0.5

### Patch Changes

- 2bc18b2: Bumped `viem` version across all packages [7861](https://github.com/NomicFoundation/hardhat/pull/7861).

## 3.0.4

### Patch Changes

- 67008ab: Improved the documentation

## 3.0.3

### Patch Changes

- 558ac5b: Update installation and config instructions

## 3.0.2

### Patch Changes

- 5521f25: Support panic errors in `hardhat-viem-assetions` and improve error messages ([#7288](https://github.com/NomicFoundation/hardhat/issues/7288))

## 3.0.1

### Patch Changes

- 7fa1412: Added JSDocs for viem assertions to help with intellisense discoverability, thanks @GarmashAlex ([#6758](https://github.com/NomicFoundation/hardhat/issues/6758))

## 3.0.0

### Major Changes

- 29cc141: First release of Hardhat 3!
