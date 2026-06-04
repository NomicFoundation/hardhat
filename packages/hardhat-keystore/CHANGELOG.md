# @nomicfoundation/hardhat-keystore

## 3.0.12

### Patch Changes

- [#8339](https://github.com/NomicFoundation/hardhat/pull/8339) [`00720e8`](https://github.com/NomicFoundation/hardhat/commit/00720e848ced4601deb300488beda85491dc7733) Thanks [@alcuadrado](https://github.com/alcuadrado)! - The plugin now uses `definePlugin` from `hardhat/plugins` in its `index.ts`, so it participates in Hardhat's new "imported but unused plugin" warning when omitted from a project's `plugins` array.

- Updated dependencies:
  - hardhat@3.8.0
  - @nomicfoundation/hardhat-errors@3.0.15

## 3.0.11

### Patch Changes

- [#8334](https://github.com/NomicFoundation/hardhat/pull/8334) [`68e9906`](https://github.com/NomicFoundation/hardhat/commit/68e9906f302914dae5d8dabb43955774e2c69672) Thanks [@gultekinmakif](https://github.com/gultekinmakif)! - Environment variables take precedence over keystore values

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.1.3
  - @nomicfoundation/hardhat-errors@3.0.14

## 3.0.10

### Patch Changes

- [#8264](https://github.com/NomicFoundation/hardhat/pull/8264) [`8452f97`](https://github.com/NomicFoundation/hardhat/commit/8452f9726205540e1684d3f8458bfd145e790226) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Export `./package.json` so consumers can import the package's manifest.

- Updated dependencies:
  - @nomicfoundation/hardhat-errors@3.0.13
  - @nomicfoundation/hardhat-utils@4.1.2
  - @nomicfoundation/hardhat-zod-utils@3.0.5

## 3.0.9

### Patch Changes

- [#8191](https://github.com/NomicFoundation/hardhat/pull/8191) [`2a4ae8e`](https://github.com/NomicFoundation/hardhat/commit/2a4ae8e7dc78cabbe8b17bec778952f0124f9759) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Update how type extensions are handled to optimize the bootstrap process of Hardhat.

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.1.1

## 3.0.8

### Patch Changes

- [#8195](https://github.com/NomicFoundation/hardhat/pull/8195) [`79205cc`](https://github.com/NomicFoundation/hardhat/commit/79205cc7dc5c89e88438ac0db8fd812720d07df2) Thanks [@ChristopherDedominici](https://github.com/ChristopherDedominici)! - Replace `chalk` with `util.styleText`.

- [#8207](https://github.com/NomicFoundation/hardhat/pull/8207) [`d594209`](https://github.com/NomicFoundation/hardhat/commit/d59420968bffca83e1ad2712c6881d19cc7e1a99) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Improved performance by replacing the debug logging library with a lightweight in-tree implementation.

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.1.0
  - @nomicfoundation/hardhat-errors@3.0.12

## 3.0.7

### Patch Changes

- [#8179](https://github.com/NomicFoundation/hardhat/pull/8179) [`d16d82a`](https://github.com/NomicFoundation/hardhat/commit/d16d82abfd5c9fa044cb508468cd4b50a5fcfd8a) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Await all returned promises for better debuggability

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.0.4

## 3.0.6

### Patch Changes

- [#8096](https://github.com/NomicFoundation/hardhat/pull/8096) [`7fb721b`](https://github.com/NomicFoundation/hardhat/commit/7fb721bb2b1c521d0073a156f361c60a049e8fdf) Thanks [@alcuadrado](https://github.com/alcuadrado)! - [chore] Move to packages/ folder.

- Updated dependencies:
  - @nomicfoundation/hardhat-errors@3.0.11
  - @nomicfoundation/hardhat-utils@4.0.3
  - @nomicfoundation/hardhat-zod-utils@3.0.4

## 3.0.5

### Patch Changes

- 6674b00: Bump `hardhat-utils` major

## 3.0.4

### Patch Changes

- f995dba: Added the `rename` task to `keystore` ([#7573](https://github.com/NomicFoundation/hardhat/issues/7573)).

## 3.0.3

### Patch Changes

- 558ac5b: Update installation and config instructions

## 3.0.2

### Patch Changes

- 7876311: Fixed the development keystore logic that was being skipped during tests if the development keystore was missing ([7592](https://github.com/NomicFoundation/hardhat/pull/7592))

## 3.0.1

### Patch Changes

- 003e72c: Help message phrasing unified

## 3.0.0

### Major Changes

- 29cc141: First release of Hardhat 3!
