# @nomicfoundation/hardhat-toolbox-viem

## 5.0.4

### Patch Changes

- [#8104](https://github.com/NomicFoundation/hardhat/pull/8104) [`e27a7ad`](https://github.com/NomicFoundation/hardhat/commit/e27a7ad584b01392afc9294f739d731ab6e78f06) Thanks [@ChristopherDedominici](https://github.com/ChristopherDedominici)! - Use code 3 for JSON-RPC revert error codes to align with standard node behavior and preserve error causes in viem/ethers.

- [#8096](https://github.com/NomicFoundation/hardhat/pull/8096) [`7fb721b`](https://github.com/NomicFoundation/hardhat/commit/7fb721bb2b1c521d0073a156f361c60a049e8fdf) Thanks [@alcuadrado](https://github.com/alcuadrado)! - [chore] Move to packages/ folder.

- [#8116](https://github.com/NomicFoundation/hardhat/pull/8116) [`88787e1`](https://github.com/NomicFoundation/hardhat/commit/88787e172a3d90652d0ffaf73e31857f6ed875cc) Thanks [@kanej](https://github.com/kanej)! - Deprecate the `hre.network.connect()` method in favour of `hre.network.create()`, exactly the same method but more clearly indicating that it will create a new connection.

- Updated dependencies:
  - hardhat@3.4.0

## 5.0.3

### Patch Changes

- 13918b4: Add support for custom chains not in viem's built-in chain list, thanks @daanporon! ([#7763](https://github.com/NomicFoundation/hardhat/issues/7763))

## 5.0.2

### Patch Changes

- 2bc18b2: Bumped `viem` version across all packages [7861](https://github.com/NomicFoundation/hardhat/pull/7861).

## 5.0.1

### Patch Changes

- 558ac5b: Update installation and config instructions

## 5.0.0

### Major Changes

- 29cc141: First release of Hardhat 3!

## 4.1.0

### Minor Changes

- 14b3042: Updated the minimal supported version of Node to v20 ([#6982](https://github.com/NomicFoundation/hardhat/pull/6982))

## 4.0.0

### Major Changes

- 94b36b0: Upgrade hardhat-gas-reporter to v2 on both toolboxes ([#6886](https://github.com/NomicFoundation/hardhat/pull/6886))

## 3.0.0

### Major Changes

- 92d140f: Include Hardhat Ignition in the toolboxes.
- cfec932: Upgraded hardhat-toolbox-viem and project creation to support viem@2

### Patch Changes

- Updated dependencies [92d140f]

## 2.0.0

### Major Changes

- 23665f399: Upgraded hardhat-verify dependency
