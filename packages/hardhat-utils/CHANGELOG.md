# @nomicfoundation/hardhat-utils

## 4.1.0

### Minor Changes

- [#8205](https://github.com/NomicFoundation/hardhat/pull/8205) [`99a4556`](https://github.com/NomicFoundation/hardhat/commit/99a4556698e1d0776951fb160641f5e2529b68ee) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Introduce the SharedPromiseCache synchronization primitive

### Patch Changes

- [#8219](https://github.com/NomicFoundation/hardhat/pull/8219) [`2cad309`](https://github.com/NomicFoundation/hardhat/commit/2cad309eb8d35fcc5d2aba5d75a5af4d63d50508) Thanks [@schaable](https://github.com/schaable)! - Improved performance by replacing the semver dependency with a lightweight in-tree implementation.

- [#8196](https://github.com/NomicFoundation/hardhat/pull/8196) [`73436aa`](https://github.com/NomicFoundation/hardhat/commit/73436aaa1ddac805f8d855627b5b40ad69cf7d2e) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Export missing error types

- [#8207](https://github.com/NomicFoundation/hardhat/pull/8207) [`d594209`](https://github.com/NomicFoundation/hardhat/commit/d59420968bffca83e1ad2712c6881d19cc7e1a99) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Improved performance by replacing the debug logging library with a lightweight in-tree implementation.

- [#8189](https://github.com/NomicFoundation/hardhat/pull/8189) [`b5ca1ae`](https://github.com/NomicFoundation/hardhat/commit/b5ca1aee1eb2571ec23f54ac8a9b2c39a90361c6) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Introduce a TrueCasePathResolver class to optimize repeated filesystem casing resolution

## 4.0.5

### Patch Changes

- [#8187](https://github.com/NomicFoundation/hardhat/pull/8187) [`8f6a418`](https://github.com/NomicFoundation/hardhat/commit/8f6a418203e78b699ca1a4d9b498d13a428e71f6) Thanks [@ChristopherDedominici](https://github.com/ChristopherDedominici)! - Improved the logic for handling `Node.js` versions that fall below the minimum requirement.

- [#8180](https://github.com/NomicFoundation/hardhat/pull/8180) [`4122faa`](https://github.com/NomicFoundation/hardhat/commit/4122faa3da2b588d83f2c94574f04ae2abd2e723) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Optimize file system traversal helpers

## 4.0.4

### Patch Changes

- [#8179](https://github.com/NomicFoundation/hardhat/pull/8179) [`d16d82a`](https://github.com/NomicFoundation/hardhat/commit/d16d82abfd5c9fa044cb508468cd4b50a5fcfd8a) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Await all returned promises for better debuggability

## 4.0.3

### Patch Changes

- [#8096](https://github.com/NomicFoundation/hardhat/pull/8096) [`7fb721b`](https://github.com/NomicFoundation/hardhat/commit/7fb721bb2b1c521d0073a156f361c60a049e8fdf) Thanks [@alcuadrado](https://github.com/alcuadrado)! - [chore] Move to packages/ folder.

- [#8119](https://github.com/NomicFoundation/hardhat/pull/8119) [`ff5a97e`](https://github.com/NomicFoundation/hardhat/commit/ff5a97e32468b0f841dc8a530ba8c2aac91a5c22) Thanks [@schaable](https://github.com/schaable)! - Show proxy chain information in --gas-stats and --gas-stats-json output

## 4.0.2

### Patch Changes

- [#7983](https://github.com/NomicFoundation/hardhat/pull/7983) [`8e194d0`](https://github.com/NomicFoundation/hardhat/commit/8e194d0899bf9a74d9cacf84e289e41ed3966c14) Thanks [@ChristopherDedominici](https://github.com/ChristopherDedominici)! - Added `--verbosity` (and `-v`, `-vv`, and the other shorthands) to all tasks, including TypeScript tests ([7983](https://github.com/NomicFoundation/hardhat/pull/7983)), ([7963](https://github.com/NomicFoundation/hardhat/issues/7963)).

- [#8073](https://github.com/NomicFoundation/hardhat/pull/8073) [`dfe4ffe`](https://github.com/NomicFoundation/hardhat/commit/dfe4ffeb57b97419ae0cca8929c9bd9c25912dbe) Thanks [@schaable](https://github.com/schaable)! - Add support for per-test inline configuration in solidity tests.

- [#8088](https://github.com/NomicFoundation/hardhat/pull/8088) [`23c0d36`](https://github.com/NomicFoundation/hardhat/commit/23c0d3658f29305bf0adbbce4644a54d7ef22550) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Optimize imports.

## 4.0.1

### Patch Changes

- 01b41ee: Added support for function gas snapshots and snapshot cheatcodes in Solidity tests with `--snapshot` and `--snapshot-check` flags ([#7769](https://github.com/NomicFoundation/hardhat/issues/7769))

## 4.0.0

### Major Changes

- 87623db: Introduce new inter-process mutex implementation ([7942](https://github.com/NomicFoundation/hardhat/pull/7942)).
- 726ff37: Update the `--coverage` table output to match the style used by `--gas-stats`. Thanks @jose-blockchain! ([#7733](https://github.com/NomicFoundation/hardhat/issues/7733))

### Patch Changes

- 87623db: Fix two issues in the `download` function ([7942](https://github.com/NomicFoundation/hardhat/pull/7942)).

## 3.0.6

### Patch Changes

- 2bc18b2: Bumped `viem` version across all packages [7861](https://github.com/NomicFoundation/hardhat/pull/7861).

## 3.0.5

### Patch Changes

- d45234d: Fixed Etherscan verification failures by removing hardcoded v1 API URLs from chain descriptors ([#7623](https://github.com/NomicFoundation/hardhat/issues/7623)). Also enhanced config resolution to support partial overrides in block explorer configurations for future extensibility.

## 3.0.4

### Patch Changes

- d1969e7: Added support for showing gas statistics after running nodejs tests ([#7472](https://github.com/NomicFoundation/hardhat/issues/7428)).

## 3.0.3

### Patch Changes

- d821a0a: Fix npm artifact cleanup on windows ([#7459](https://github.com/NomicFoundation/hardhat/issues/7459))
- b13620a: Add compilation progress spinner to show build progress ([#7460](https://github.com/NomicFoundation/hardhat/pull/7460))

## 3.0.2

### Patch Changes

- 8c1cb1e: Fixed peer dependencies for Hardhat so `rpc` utils can be loaded ([#7415](https://github.com/NomicFoundation/hardhat/issues/7415))

## 3.0.1

### Patch Changes

- 49cc9ba: Load resolved global options into environment variables during tests ([#7305](https://github.com/NomicFoundation/hardhat/pull/7305))
- 8d3b16c: Support for custom compilers ([#7130](https://github.com/NomicFoundation/hardhat/issues/7130))
- a475780: Added automatic proxy detection for `hardhat-verify` and fixed case-insensitive proxy environment variables for network requests ([#7407](https://github.com/NomicFoundation/hardhat/pull/7407))

## 3.0.0

### Major Changes

- 29cc141: First release of Hardhat 3!
