# @nomicfoundation/hardhat-ledger

## 3.0.7

### Patch Changes

- [#8207](https://github.com/NomicFoundation/hardhat/pull/8207) [`d594209`](https://github.com/NomicFoundation/hardhat/commit/d59420968bffca83e1ad2712c6881d19cc7e1a99) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Improved performance by replacing the debug logging library with a lightweight in-tree implementation.

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.1.0
  - @nomicfoundation/hardhat-errors@3.0.12

## 3.0.6

### Patch Changes

- [#8179](https://github.com/NomicFoundation/hardhat/pull/8179) [`d16d82a`](https://github.com/NomicFoundation/hardhat/commit/d16d82abfd5c9fa044cb508468cd4b50a5fcfd8a) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Await all returned promises for better debuggability

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.0.4

## 3.0.5

### Patch Changes

- [#8147](https://github.com/NomicFoundation/hardhat/pull/8147) [`1eca5b2`](https://github.com/NomicFoundation/hardhat/commit/1eca5b2f7a9dd9cc34f1c109c964fb6221adc4ac) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Workaround `@ledgerhq/errors` issue [#15967](https://github.com/NomicFoundation/hardhat/issues/15967)

- [#8096](https://github.com/NomicFoundation/hardhat/pull/8096) [`7fb721b`](https://github.com/NomicFoundation/hardhat/commit/7fb721bb2b1c521d0073a156f361c60a049e8fdf) Thanks [@alcuadrado](https://github.com/alcuadrado)! - [chore] Move to packages/ folder.

- [#8116](https://github.com/NomicFoundation/hardhat/pull/8116) [`88787e1`](https://github.com/NomicFoundation/hardhat/commit/88787e172a3d90652d0ffaf73e31857f6ed875cc) Thanks [@kanej](https://github.com/kanej)! - Deprecate the `hre.network.connect()` method in favour of `hre.network.create()`, exactly the same method but more clearly indicating that it will create a new connection.

- Updated dependencies:
  - hardhat@3.4.0
  - @nomicfoundation/hardhat-errors@3.0.11
  - @nomicfoundation/hardhat-utils@4.0.3
  - @nomicfoundation/hardhat-zod-utils@3.0.4

## 3.0.4

### Patch Changes

- [#8088](https://github.com/NomicFoundation/hardhat/pull/8088) [`3e61d58`](https://github.com/NomicFoundation/hardhat/commit/3e61d586821edc211e0fbeec304e7bedf1b20242) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Optimize imports.

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.0.2
  - @nomicfoundation/hardhat-errors@3.0.10

## 3.0.3

### Patch Changes

- 6674b00: Bump `hardhat-utils` major

## 3.0.2

### Patch Changes

- 228f32c: Fixed reconnection when Ledger device is unplugged/replugged during operations ([#7896](https://github.com/NomicFoundation/hardhat/issues/7896))
- 076895f: Handled locked or the Ethereum App not being opened errors by adding a wait and retry ([#7905](https://github.com/NomicFoundation/hardhat/pull/7905))
- 6afeb03: Fixed the `hardhat-ledger` bug for networks where the `eth_accounts` method is not supported ([#7885](https://github.com/NomicFoundation/hardhat/pull/7885))

## 3.0.1

### Patch Changes

- d053490: Fixed a bug in `hardhat-ledger` where the `derivationFunction` parameter was being ignored ([7682](https://github.com/NomicFoundation/hardhat/pull/7682)).

## 3.0.0

### Major Changes

- a7686bd: Update `hardhat-ledger` to support Hardhat 3 ([#7272](https://github.com/NomicFoundation/hardhat/issues/7272))

## 1.2.1

### Patch Changes

- 558ac5b: Update installation and config instructions
