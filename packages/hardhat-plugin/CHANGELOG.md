# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## 0.0.5 - 2022-12-20

### Added

- Add params section to deploy display in cli ([#74](https://github.com/NomicFoundation/ignition/pull/74))
- Expose config for pollingInterval ([#75](https://github.com/NomicFoundation/ignition/pull/75))
- Support `getBytesForArtifact` in deployment api ([#76](https://github.com/NomicFoundation/ignition/pull/76))
- Support use of emitted event args as futures for later deployment api calls ([#77](https://github.com/NomicFoundation/ignition/pull/77))
- Support event params futures in `contractAt` ([#78](https://github.com/NomicFoundation/ignition/pull/78))

### Fixed

- Fix for planning on modules with deploys from artifacts ([#73](https://github.com/NomicFoundation/ignition/pull/73))

## 0.0.4 - 2022-11-22

### Added

- Support setting module params from JSON file ([#64](https://github.com/NomicFoundation/ignition/pull/64))

## 0.0.3 - 2022-11-09

### Added

- Allow modules to depend on other calls ([#53](https://github.com/NomicFoundation/ignition/pull/53))
- Allow depending on a module ([#54](https://github.com/NomicFoundation/ignition/pull/54))

### Changed

- Dependening on returned module contract equivalent to depending on the module ([#55](https://github.com/NomicFoundation/ignition/pull/55))

## 0.0.2 - 2022-10-26

### Added

- Add `deploy` task to hardhat via the plugin
- Add `plan` task to hardhat via the plugin
