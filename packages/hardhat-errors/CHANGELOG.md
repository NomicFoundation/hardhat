# @nomicfoundation/hardhat-errors

## 3.0.16

### Patch Changes

- [#8098](https://github.com/NomicFoundation/hardhat/pull/8098) [`3146838`](https://github.com/NomicFoundation/hardhat/commit/31468384f6f9f3ac5d31e387e926c7325115a133) Thanks [@ChristopherDedominici](https://github.com/ChristopherDedominici)! - Handle mempool lag in nonce validation by retrying before erroring on stale pending counts ([8092](https://github.com/NomicFoundation/hardhat/issues/8092)).

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.1.4

## 3.0.15

### Patch Changes

- [#8349](https://github.com/NomicFoundation/hardhat/pull/8349) [`af31a41`](https://github.com/NomicFoundation/hardhat/commit/af31a415fddb7531fea240f662bd47e33e33690b) Thanks [@schaable](https://github.com/schaable)! - Improved `hardhat verify` to fail faster when the block explorer reports that the constructor arguments are incorrect.

  Thanks to @gultekinmakif for the original idea and implementation in [#8333](https://github.com/NomicFoundation/hardhat/issues/8333).

## 3.0.14

### Patch Changes

- [#8326](https://github.com/NomicFoundation/hardhat/pull/8326) [`959f2e1`](https://github.com/NomicFoundation/hardhat/commit/959f2e1989c4bcbff05f717b33a2df1098f67616) Thanks [@kanej](https://github.com/kanej)! - Fixed `hardhat flatten` silently producing a misleading output for projects with cyclic Solidity dependencies.

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.1.3

## 3.0.13

### Patch Changes

- [#8243](https://github.com/NomicFoundation/hardhat/pull/8243) [`f2cdddd`](https://github.com/NomicFoundation/hardhat/commit/f2cdddda6b37a4c590309ac01c078492d54d6a98) Thanks [@ChristopherDedominici](https://github.com/ChristopherDedominici)! - Add error descriptor for duplicate EIP-712 struct names surfaced by the Solidity Test cheatcodes.

- [#8264](https://github.com/NomicFoundation/hardhat/pull/8264) [`8452f97`](https://github.com/NomicFoundation/hardhat/commit/8452f9726205540e1684d3f8458bfd145e790226) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Export `./package.json` so consumers can import the package's manifest.

- [#8188](https://github.com/NomicFoundation/hardhat/pull/8188) [`d48bbfd`](https://github.com/NomicFoundation/hardhat/commit/d48bbfd86c22f5dfaaee7e926814ace0db20f320) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Add `--init --template <template-name>` to initialize projects in a non-interactive way. Also add `--init --templates` to get the list of template names.

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.1.2

## 3.0.12

### Patch Changes

- [#8196](https://github.com/NomicFoundation/hardhat/pull/8196) [`b669814`](https://github.com/NomicFoundation/hardhat/commit/b6698146abc87aaa6b2b2f18c830a01dba9b6daa) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Improve error messages in common failures

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.1.0

## 3.0.11

### Patch Changes

- [#8148](https://github.com/NomicFoundation/hardhat/pull/8148) [`49ec5d0`](https://github.com/NomicFoundation/hardhat/commit/49ec5d0cd4ddfaa97ec1fe1838d781cc41e53d72) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Don't report HardhatErrors that aren't bugs

- [#8096](https://github.com/NomicFoundation/hardhat/pull/8096) [`7fb721b`](https://github.com/NomicFoundation/hardhat/commit/7fb721bb2b1c521d0073a156f361c60a049e8fdf) Thanks [@alcuadrado](https://github.com/alcuadrado)! - [chore] Move to packages/ folder.

- [#8116](https://github.com/NomicFoundation/hardhat/pull/8116) [`88787e1`](https://github.com/NomicFoundation/hardhat/commit/88787e172a3d90652d0ffaf73e31857f6ed875cc) Thanks [@kanej](https://github.com/kanej)! - Deprecate the `hre.network.connect()` method in favour of `hre.network.create()`, exactly the same method but more clearly indicating that it will create a new connection.

- [#8127](https://github.com/NomicFoundation/hardhat/pull/8127) [`353cf86`](https://github.com/NomicFoundation/hardhat/commit/353cf86d83f43aba998d63acf646bec5e3355512) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Make the split of contracts and solidity tests compilation optional, and controlled with a new `splitTestsCompilation` config field.

- [#8115](https://github.com/NomicFoundation/hardhat/pull/8115) [`935a043`](https://github.com/NomicFoundation/hardhat/commit/935a043bd34cfb91593b5485c9b672282109c699) Thanks [@ChristopherDedominici](https://github.com/ChristopherDedominici)! - Breaking change: removed `timeout` option for Solidity tests in `hardhat.config.ts` file.

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.0.3

## 3.0.10

### Patch Changes

- [#8073](https://github.com/NomicFoundation/hardhat/pull/8073) [`dfe4ffe`](https://github.com/NomicFoundation/hardhat/commit/dfe4ffeb57b97419ae0cca8929c9bd9c25912dbe) Thanks [@schaable](https://github.com/schaable)! - Add support for per-test inline configuration in solidity tests.

- [#8008](https://github.com/NomicFoundation/hardhat/pull/8008) [`57d1075`](https://github.com/NomicFoundation/hardhat/commit/57d10751c101fc00aeab2b588d23003c597edc40) Thanks [@marianfe](https://github.com/marianfe)! - Introduce the `ConfigHooks#validateResolvedConfig` hook and the `HardhatConfigValidationError` type to be able to run global validations on the resolved config ([#8008](https://github.com/NomicFoundation/hardhat/pull/8008)).

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.0.2

## 3.0.9

### Patch Changes

- [#8060](https://github.com/NomicFoundation/hardhat/pull/8060) [`0e8abcf`](https://github.com/NomicFoundation/hardhat/commit/0e8abcf376b7b3618261512c98ae5dcfef716216) Thanks [@kanej](https://github.com/kanej)! - Added guard against `http` network configs in `network.createServer(...)`

- [#8064](https://github.com/NomicFoundation/hardhat/pull/8064) [`392fc38`](https://github.com/NomicFoundation/hardhat/commit/392fc388556e9ec3ca1309db0ffb2ded24439ee2) Thanks [@schaable](https://github.com/schaable)! - Add `--gas-stats-json <path>` global option to write gas usage statistics to a JSON file ([#7990](https://github.com/NomicFoundation/hardhat/issues/7990)).

## 3.0.8

### Patch Changes

- 01b41ee: Added support for function gas snapshots and snapshot cheatcodes in Solidity tests with `--snapshot` and `--snapshot-check` flags ([#7769](https://github.com/NomicFoundation/hardhat/issues/7769))

## 3.0.7

### Patch Changes

- 6674b00: Bump `hardhat-utils` major
- 4cd63e9: Introduce the `@nomicfoundation/hardhat-foundry` plugin for Hardhat 3
- f1e9b05: Added support for `inline actions` in tasks [7851](https://github.com/NomicFoundation/hardhat/pull/7851).

## 3.0.6

### Patch Changes

- 6b2ed9a: Add ability for task options to be hidden from the CLI ([#7426](https://github.com/NomicFoundation/hardhat/issues/7426))

## 3.0.5

### Patch Changes

- 03a4539: Export error descriptors for the website
- 95684ac: Full links to documentation replaced by short links with redirects added to the Hardhat website ([#142](https://github.com/NomicFoundation/hardhat-website/issues/142))

## 3.0.4

### Patch Changes

- ce5c22a: Fail when a file isn't built neither as contract nor test

## 3.0.3

### Patch Changes

- a871e3e: Ported the `@nomicfoundation/hardhat-ledger` plugin to Hardhat 3 ([#5646](https://github.com/NomicFoundation/hardhat/issues/5646))

## 3.0.2

### Patch Changes

- be469d6: Display an error message when attempting to use a global hardhat installation in a local repo ([#5362](https://github.com/NomicFoundation/hardhat/issues/5362))
- 8d3b16c: Support for custom compilers ([#7130](https://github.com/NomicFoundation/hardhat/issues/7130))

## 3.0.1

### Patch Changes

- ddefbff: Added guard to stop multiple simultaneous calls to `ignition.deploy(...)` at once ([#6440](https://github.com/NomicFoundation/hardhat/issues/6440))

## 3.0.0

### Major Changes

- 29cc141: First release of Hardhat 3!
