# @nomicfoundation/hardhat-foundry

## 3.0.4

### Patch Changes

- [#8339](https://github.com/NomicFoundation/hardhat/pull/8339) [`00720e8`](https://github.com/NomicFoundation/hardhat/commit/00720e848ced4601deb300488beda85491dc7733) Thanks [@alcuadrado](https://github.com/alcuadrado)! - The plugin now uses `definePlugin` from `hardhat/plugins` in its `index.ts`, so it participates in Hardhat's new "imported but unused plugin" warning when omitted from a project's `plugins` array.

- Updated dependencies:
  - hardhat@3.8.0
  - @nomicfoundation/hardhat-errors@3.0.15

## 3.0.3

### Patch Changes

- [#8264](https://github.com/NomicFoundation/hardhat/pull/8264) [`8452f97`](https://github.com/NomicFoundation/hardhat/commit/8452f9726205540e1684d3f8458bfd145e790226) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Export `./package.json` so consumers can import the package's manifest.

- Updated dependencies:
  - @nomicfoundation/hardhat-errors@3.0.13
  - @nomicfoundation/hardhat-utils@4.1.2

## 3.0.2

### Patch Changes

- [#8179](https://github.com/NomicFoundation/hardhat/pull/8179) [`d16d82a`](https://github.com/NomicFoundation/hardhat/commit/d16d82abfd5c9fa044cb508468cd4b50a5fcfd8a) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Await all returned promises for better debuggability

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.0.4

## 3.0.1

### Patch Changes

- [#8096](https://github.com/NomicFoundation/hardhat/pull/8096) [`7fb721b`](https://github.com/NomicFoundation/hardhat/commit/7fb721bb2b1c521d0073a156f361c60a049e8fdf) Thanks [@alcuadrado](https://github.com/alcuadrado)! - [chore] Move to packages/ folder.

- Updated dependencies:
  - @nomicfoundation/hardhat-errors@3.0.11
  - @nomicfoundation/hardhat-utils@4.0.3

## 3.0.0

### Major Changes

- 4cd63e9: Introduce the `@nomicfoundation/hardhat-foundry` plugin for Hardhat 3
