# @nomicfoundation/hardhat-verify

## 3.0.7

### Patch Changes

- 29acf32: Added fallback for chains not included in chain descriptors ([#7657](https://github.com/NomicFoundation/hardhat/issues/7657))

## 3.0.6

### Patch Changes

- 6307578: Added support for verifying contracts via Sourcify, thanks @manuelwedler ([#6885](https://github.com/NomicFoundation/hardhat/issues/6885)).

## 3.0.5

### Patch Changes

- d45234d: Fixed Etherscan verification failures by removing hardcoded v1 API URLs from chain descriptors ([#7623](https://github.com/NomicFoundation/hardhat/issues/7623)). Also enhanced config resolution to support partial overrides in block explorer configurations for future extensibility.
- 558ac5b: Update installation and config instructions

## 3.0.4

### Patch Changes

- cbcb5ce: Fixed `hardhat-verify` by using apiUrl from etherscanConfig for verification ([#7509](https://github.com/NomicFoundation/hardhat/issues/7509))

## 3.0.3

### Patch Changes

- d25eec4: Fixed a bug that prevented verification of contracts imported from npm modules ([#7442](https://github.com/NomicFoundation/hardhat/pull/7442))

## 3.0.2

### Patch Changes

- a475780: Added automatic proxy detection for `hardhat-verify` and fixed case-insensitive proxy environment variables for network requests ([#7407](https://github.com/NomicFoundation/hardhat/pull/7407))

## 3.0.1

### Patch Changes

- 0016b57: Fix `ContractInformationResolver` to use optional chaining when accessing compiler output contracts to prevent potential `TypeError` ([#7291](https://github.com/NomicFoundation/hardhat/pull/7291))

## 3.0.0

### Major Changes

- 29cc141: First release of Hardhat 3!

## 2.1.1

### Patch Changes

- 11ee260: Don't use `undici`'s global dispatcher, making Hardhat more stable across Node.js versions

## 2.1.0

### Minor Changes

- 14b3042: Updated the minimal supported version of Node to v20 ([#6982](https://github.com/NomicFoundation/hardhat/pull/6982))

## 2.0.14

### Patch Changes

- d0c3dcf: Support Etherscan API v2 (#6716)
- Updated dependencies [9b75f5d]
- Updated dependencies [a8ad44c]
  - hardhat@2.24.1

## 2.0.13

### Patch Changes

- 0469eb2: Ink networks added

## 2.0.12

### Patch Changes

- f571670: Replace chalk with picocolors

## 2.0.11

### Patch Changes

- 913b5a1: Added Blockscout as a verification provider

## 2.0.10

### Patch Changes

- efa905d: Fix for corrupted Hardhat peer dependency version from pnpm.

## 2.0.9

### Patch Changes

- 88e57fa: Make the `--force` flag override the check of any existing verification, even in the presence of errors.

## 2.0.8

### Patch Changes

- 73d5bea: Improved validation of constructor arguments (thanks @fwx5618177!)

## 2.0.7

### Patch Changes

- f186e1a: Improved error handling and messaging for errors from the block explorer
- e7b12df: Added Polygon Amoy testnet (thanks @FournyP!)
- b9aada0: Added `--force` flag to allow verification of partially verified contracts (thanks @rimrakhimov!)

## 2.0.6

### Patch Changes

- 62d24cd: Added baseSepolia (thanks @hironate)

## 2.0.5

### Patch Changes

- 91d035e: Updated polygonZkEVMTestnet to point to cardona testnet

## 2.0.4

### Patch Changes

- fb673f2be: Added holesky and arbitrumSepolia, and removed arbitrumTestnet and arbitrumGoerli from hardhat-verify chains.
- 11043e96a: Added support for programmatic verification in Sourcify

## 2.0.3

### Patch Changes

- e77f1d8a0: Add apiUrl and browserUrl to Sourcify configuration.

## 2.0.2

### Patch Changes

- 5cab65fb7: Updated chiado urls to avoid redirect

## 2.0.1

### Patch Changes

- c2155fb26: Added polygonZkEVM and polygonZkEVMTestnet
- c7d87c41a: Fixed case-sensitive address comparison for detecting verified contracts

## 2.0.0

### Major Changes

- a32e68589: - Added Sourcify as a verification provider.

## 1.1.1

### Patch Changes

- 4ed196924: Added `base` mainnet

## 1.1.0

### Minor Changes

- e2fc27766: Exposed the Etherscan class as a public API for third-party consumers.

## 1.0.4

### Patch Changes

- 0f4411ce0: Added `baseGoerli` testnet.

## 1.0.3

### Patch Changes

- efe7824e0: Removed the `rinkeby`, `ropsten` and `kovan` deprecated test networks (thanks @pcaversaccio!)

## 1.0.2

### Patch Changes

- 4028c6e24: Fix URLs for the Aurora networks (thanks @zZoMROT and @ZumZoom!)
- 4028c6e24: Fixed a problem where the `--list-networks` flag wasn't working without passing an address (thanks @clauBv23!)
- 72162dcc7: Success messages are now more generic (thanks @clauBv23!).

## 1.0.1

### Patch Changes

- 40b371bca: Removed the compilation step from the verify task, and removed the noCompile flag
