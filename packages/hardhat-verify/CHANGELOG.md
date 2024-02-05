# @nomicfoundation/hardhat-verify

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
