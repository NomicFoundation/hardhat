# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## 0.13.1 - 2023-12-19

### Added

- Repo now supports .devcontainer for VSCode ([#657](https://github.com/NomicFoundation/hardhat-ignition/pull/657))
- New flag `--reset` for `ignition deploy` to wipe the existing deployment state before running ([#651](https://github.com/NomicFoundation/hardhat-ignition/pull/651))

### Fixed

- Fix bug with `process.stdout` being used in a non-tty context ([#654](https://github.com/NomicFoundation/hardhat-ignition/pull/654))

## 0.13.0 - 2023-12-13

### Added

- Add `@nomicfoundation/hardhat-plugin-viem` package, that adds an `ignition` object to the Hardhat Runtime Environment that supports deploying Ignition modules and returning deployed contracts as [Viem](https://viem.sh/) contract instances, see the our [Viem guide](https://hardhat.org/ignition/docs/guides/viem) for more details ([#612](https://github.com/NomicFoundation/hardhat-ignition/pull/612))
- Add support for setting the default sender account from tests and scripts ([#639](https://github.com/NomicFoundation/hardhat-ignition/issues/639))
