# @nomiclabs/hardhat-vyper

## 3.0.3

### Patch Changes

- a7e70047e: Keep the parent exception when throwing because the compiler list download failed.
- 5231d38f4: Use our mirror to download Vyper releases, which should be more stable

## 3.0.2

### Patch Changes

- 7e81377fc: Fix vyper compiler download timeouts

## 3.0.1

### Patch Changes

- 2e9df3d73: The gas field is not included in the artifacts's ABI anymore (thanks @MarkuSchick).
- 2922b15f5: Improve the compilation performance by not using the `glob` library whenever we can avoid it.

## 3.0.0

### Major Changes

- 9b1de8e0: Full rework of vyper plugin (#2082, #1364, #1338, #1335, #1258)
