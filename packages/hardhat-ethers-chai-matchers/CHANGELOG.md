# @nomicfoundation/hardhat-ethers-chai-matchers

## 3.0.7

### Patch Changes

- [#8207](https://github.com/NomicFoundation/hardhat/pull/8207) [`d594209`](https://github.com/NomicFoundation/hardhat/commit/d59420968bffca83e1ad2712c6881d19cc7e1a99) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Improved performance by replacing the debug logging library with a lightweight in-tree implementation.

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.1.0

## 3.0.6

### Patch Changes

- [#8179](https://github.com/NomicFoundation/hardhat/pull/8179) [`d16d82a`](https://github.com/NomicFoundation/hardhat/commit/d16d82abfd5c9fa044cb508468cd4b50a5fcfd8a) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Await all returned promises for better debuggability

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.0.4

## 3.0.5

### Patch Changes

- [#8096](https://github.com/NomicFoundation/hardhat/pull/8096) [`7fb721b`](https://github.com/NomicFoundation/hardhat/commit/7fb721bb2b1c521d0073a156f361c60a049e8fdf) Thanks [@alcuadrado](https://github.com/alcuadrado)! - [chore] Move to packages/ folder.

- [#8116](https://github.com/NomicFoundation/hardhat/pull/8116) [`88787e1`](https://github.com/NomicFoundation/hardhat/commit/88787e172a3d90652d0ffaf73e31857f6ed875cc) Thanks [@kanej](https://github.com/kanej)! - Deprecate the `hre.network.connect()` method in favour of `hre.network.create()`, exactly the same method but more clearly indicating that it will create a new connection.

- Updated dependencies:
  - hardhat@3.4.0
  - @nomicfoundation/hardhat-utils@4.0.3

## 3.0.4

### Patch Changes

- [#7997](https://github.com/NomicFoundation/hardhat/pull/7997) [`670fd5b`](https://github.com/NomicFoundation/hardhat/commit/670fd5b08d49084d76779be1a1046c2013bf228a) Thanks [@ChristopherDedominici](https://github.com/ChristopherDedominici)! - Added support to `hardhat-ethers-chai-matchers` for networks that do not support `automine` ([7952](https://github.com/NomicFoundation/hardhat/issues/7952)).

- Updated dependencies:
  - @nomicfoundation/hardhat-ethers@4.0.7
  - @nomicfoundation/hardhat-utils@4.0.2

## 3.0.3

### Patch Changes

- 3d03bd6: Upgrade Chai to v6, while keeping compatibility with v5
- 6674b00: Bump `hardhat-utils` major
- 33a3b44: Only use `AssertionError`s within assertion functions [#7993](https://github.com/NomicFoundation/hardhat/pull/7993)

## 3.0.2

### Patch Changes

- a376396: Improved the documentation

## 3.0.1

### Patch Changes

- 558ac5b: Update installation and config instructions

## 3.0.0

### Major Changes

- 29cc141: First release of Hardhat 3!
