# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## 0.15.6 - 2024-09-25

### Added

- Updates to the visualization UI, including the ability to zoom and pan the mermaid diagram ([#810](https://github.com/NomicFoundation/hardhat-ignition/pull/810))
- `gasPrice` and `disableFeeBumping` config fields added as part of our L2 gas logic update ([#808](https://github.com/NomicFoundation/hardhat-ignition/pull/808))
- Debug logging for communication errors with Hardhat Ledger ([#792](https://github.com/NomicFoundation/hardhat-ignition/pull/792))
- JSON5 support for module parameters, thanks @erhant ([#800](https://github.com/NomicFoundation/hardhat-ignition/pull/800))
- Add `writeLocalhostDeployment` flag to allow saving deployment artifacts when deploying to the ephemeral Hardhat network, thanks @SebastienGllmt ([#816](https://github.com/NomicFoundation/hardhat-ignition/pull/816))

### Fixed

- Replace `this` with the class itself in `ViemIgnitionHelper`, thanks @iosh ([#796](https://github.com/NomicFoundation/hardhat-ignition/pull/796))

## 0.11.0 - 2023-10-23

### Added

- Display batching information in the visualize report ([#494](https://github.com/NomicFoundation/hardhat-ignition/issues/494))
- Update styling of visualize report ([#493](https://github.com/NomicFoundation/hardhat-ignition/issues/493))

## 0.4.0 - 2023-09-15

### Changed

- Now published on the `@nomicfoundation` namespace

## 0.1.0 - 2023-07-27

### Added

- A UI used to display plans of Ignition deployments
