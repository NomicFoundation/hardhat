# @nomicfoundation/hardhat-toolbox-mocha-ethers

## 3.0.7

### Patch Changes

- [#8339](https://github.com/NomicFoundation/hardhat/pull/8339) [`00720e8`](https://github.com/NomicFoundation/hardhat/commit/00720e848ced4601deb300488beda85491dc7733) Thanks [@alcuadrado](https://github.com/alcuadrado)! - The plugin now uses `definePlugin` from `hardhat/plugins` in its `index.ts`, so it participates in Hardhat's new "imported but unused plugin" warning when omitted from a project's `plugins` array.

- Updated dependencies:
  - hardhat@3.8.0

## 3.0.6

### Patch Changes

- [#8264](https://github.com/NomicFoundation/hardhat/pull/8264) [`8452f97`](https://github.com/NomicFoundation/hardhat/commit/8452f9726205540e1684d3f8458bfd145e790226) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Export `./package.json` so consumers can import the package's manifest.

## 3.0.5

### Patch Changes

- [#8191](https://github.com/NomicFoundation/hardhat/pull/8191) [`2a4ae8e`](https://github.com/NomicFoundation/hardhat/commit/2a4ae8e7dc78cabbe8b17bec778952f0124f9759) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Update how type extensions are handled to optimize the bootstrap process of Hardhat.

## 3.0.4

### Patch Changes

- [#8096](https://github.com/NomicFoundation/hardhat/pull/8096) [`7fb721b`](https://github.com/NomicFoundation/hardhat/commit/7fb721bb2b1c521d0073a156f361c60a049e8fdf) Thanks [@alcuadrado](https://github.com/alcuadrado)! - [chore] Move to packages/ folder.

- [#8116](https://github.com/NomicFoundation/hardhat/pull/8116) [`88787e1`](https://github.com/NomicFoundation/hardhat/commit/88787e172a3d90652d0ffaf73e31857f6ed875cc) Thanks [@kanej](https://github.com/kanej)! - Deprecate the `hre.network.connect()` method in favour of `hre.network.create()`, exactly the same method but more clearly indicating that it will create a new connection.

- Updated dependencies:
  - hardhat@3.4.0

## 3.0.3

### Patch Changes

- 3d03bd6: Upgrade Chai to v6, while keeping compatibility with v5
- 6674b00: Bump `hardhat-utils` major

## 3.0.2

### Patch Changes

- 745af93: Fixed `hardhat-toolbox-mocha-ethers` add `mocha` to `peerDependencies` ([#7519](https://github.com/NomicFoundation/hardhat/issues/7519))

## 3.0.1

### Patch Changes

- 558ac5b: Update installation and config instructions

## 3.0.0

### Major Changes

- 29cc141: First release of Hardhat 3!
