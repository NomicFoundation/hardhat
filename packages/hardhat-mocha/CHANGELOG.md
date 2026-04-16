# @nomicfoundation/hardhat-mocha

## 3.0.16

### Patch Changes

- [#8127](https://github.com/NomicFoundation/hardhat/pull/8127) [`4fe12fe`](https://github.com/NomicFoundation/hardhat/commit/4fe12feefe3b868b6b651a708155c75849988c2d) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Update to the new splitTestsCompilation setting

- [#8096](https://github.com/NomicFoundation/hardhat/pull/8096) [`7fb721b`](https://github.com/NomicFoundation/hardhat/commit/7fb721bb2b1c521d0073a156f361c60a049e8fdf) Thanks [@alcuadrado](https://github.com/alcuadrado)! - [chore] Move to packages/ folder.

- Updated dependencies:
  - hardhat@3.4.0
  - @nomicfoundation/hardhat-errors@3.0.11
  - @nomicfoundation/hardhat-utils@4.0.3
  - @nomicfoundation/hardhat-zod-utils@3.0.4

## 3.0.15

### Patch Changes

- [#8088](https://github.com/NomicFoundation/hardhat/pull/8088) [`23c0d36`](https://github.com/NomicFoundation/hardhat/commit/23c0d3658f29305bf0adbbce4644a54d7ef22550) Thanks [@alcuadrado](https://github.com/alcuadrado)! - Optimize imports.

- Updated dependencies:
  - @nomicfoundation/hardhat-utils@4.0.2
  - @nomicfoundation/hardhat-errors@3.0.10

## 3.0.14

### Patch Changes

- [#8064](https://github.com/NomicFoundation/hardhat/pull/8064) [`392fc38`](https://github.com/NomicFoundation/hardhat/commit/392fc388556e9ec3ca1309db0ffb2ded24439ee2) Thanks [@schaable](https://github.com/schaable)! - Add `--gas-stats-json <path>` global option to write gas usage statistics to a JSON file ([#7990](https://github.com/NomicFoundation/hardhat/issues/7990)).

- Updated dependencies:
  - hardhat@3.2.0
  - @nomicfoundation/hardhat-errors@3.0.9

## 3.0.13

### Patch Changes

- e37f96c: Add `TestRunResult` type that wraps `TestSummary`, allowing plugins to extend test results with additional data

## 3.0.12

### Patch Changes

- 4ff11c1: Return typed `Result` from test runners and telemetry tasks ([#8015](https://github.com/NomicFoundation/hardhat/pull/8015)).
- 2cbf218: Add `onTestRunStart`, `onTestWorkerDone`, and `onTestRunDone` test hooks ([#8001](https://github.com/NomicFoundation/hardhat/pull/8001))

## 3.0.11

### Patch Changes

- 6674b00: Bump `hardhat-utils` major
- 33a3b44: Improve the error message shown when an `await` is missing [#7993](https://github.com/NomicFoundation/hardhat/pull/7993)

## 3.0.10

### Patch Changes

- c6e93c4: Added extra debugging support for tracking performance in `npx hardhat test mocha` test runs ([#7948](https://github.com/NomicFoundation/hardhat/pull/7948))

## 3.0.9

### Patch Changes

- 12d7468: Add mocha results to test summary numbers ([#7791](https://github.com/NomicFoundation/hardhat/pull/7791))

## 3.0.8

### Patch Changes

- 3667ecd: Fixed `hardhat-mocha` dependencies by moving `hardhat` and `mocha` to `peerDependencies` ([#7519](https://github.com/NomicFoundation/hardhat/issues/7519))

## 3.0.7

### Patch Changes

- 147f8a6: Improved the look and feel of compilation output ([#7669](https://github.com/NomicFoundation/hardhat/pull/7669))

## 3.0.6

### Patch Changes

- 558ac5b: Update installation and config instructions

## 3.0.5

### Patch Changes

- d1969e7: Added support for showing gas statistics after running nodejs tests ([#7472](https://github.com/NomicFoundation/hardhat/issues/7428)).
- 5e64246: Improved JS/TS test tasks to not compile Solidity tests ([#7626](https://github.com/NomicFoundation/hardhat/pull/7626))

## 3.0.4

### Patch Changes

- 0ee442d: All test runners now set NODE_ENV to "test" in case it is not set before the tests start ([#7511](https://github.com/NomicFoundation/hardhat/issues/7511))

## 3.0.3

### Patch Changes

- 0fb6d34: Show error message on unawaited async expectations ([#7321](https://github.com/NomicFoundation/hardhat/issues/7321))

## 3.0.2

### Patch Changes

- 49cc9ba: Load resolved global options into environment variables during tests ([#7305](https://github.com/NomicFoundation/hardhat/pull/7305))

## 3.0.1

### Patch Changes

- d45d544: Fixed passing global network options to node:test and mocha subprocesses ([#7248](https://github.com/NomicFoundation/hardhat/issues/7248))
- d45d544: Fixed collecting coverage from parallel mocha test runs

## 3.0.0

### Major Changes

- 29cc141: First release of Hardhat 3!
