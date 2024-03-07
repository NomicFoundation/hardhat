# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## 0.15.0 - 2024-03-13

### Added

- Support `create2` through strategies, for more details see [our `create2` guide](https://hardhat.org/ignition/docs/guides/create2). ([#629](https://github.com/NomicFoundation/hardhat-ignition/issues/629))

## 0.13.2 - 2024-01-25

### Fixed

- Add memory pool lookup retry to reduce errors from slow propogation ([#667](https://github.com/NomicFoundation/hardhat-ignition/pull/667))

### Added

- Improve Module API typescript doc comments to enhance intellisense experience ([#642](https://github.com/NomicFoundation/hardhat-ignition/issues/642))
- Support module parameters taking accounts as the default value ([673](https://github.com/NomicFoundation/hardhat-ignition/issues/673))

## 0.13.1 - 2023-12-19

### Added

- New flag `--reset` for `ignition deploy` to wipe the existing deployment state before running ([#649](https://github.com/NomicFoundation/hardhat-ignition/issues/649))

### Fixed

- Fix bug with `process.stdout` being used in a non-tty context ([#644](https://github.com/NomicFoundation/hardhat-ignition/issues/644))

## 0.13.0 - 2023-12-13

### Added

- Add `@nomicfoundation/hardhat-plugin-ethers` package, that adds an `ignition` object to the Hardhat Runtime Environment that supports deploying Ignition modules and returning deployed contracts as [Ethers](https://docs.ethers.org) contract instances ([#612](https://github.com/NomicFoundation/hardhat-ignition/pull/612))
- Add support for setting the default sender account from tests and scripts ([#639](https://github.com/NomicFoundation/hardhat-ignition/issues/639))
