# @nomiclabs/hardhat-etherscan

## 3.1.7

### Patch Changes

- 17de12666: Don't try to verify contracts that have already been verified
- 6f94b851d: Add support for Gnosis Chain's Chiado testnet

## 3.1.6

### Patch Changes

- 070abb7f5: Added support for the `http_proxy` environment variable. When this variable is set, `hardhat-etherscan` will use the given proxy to send the verification requests.

## 3.1.5

### Patch Changes

- 7e013fa19: Upgrade undici

## 3.1.4

### Patch Changes

- fdeba783f: A warning is now shown when there is an etherscan entry in the networks object.

## 3.1.3

### Patch Changes

- 17b275de3: Add `--no-compile` flag to the `verify` task

## 3.1.2

### Patch Changes

- eb3f7a7bd: - Added Arbitrum Goerli to the list of supported networks.
  - Fixed the Optimism Goerli URLs.

## 3.1.1

### Patch Changes

- adb075d42: Added gnosis as an alias for xdai (thanks @alebanzas!)
- a30dcee88: Added Optimism Goerli and removed Optimism Kovan

## 3.1.0

### Minor Changes

- c4283f816: Added support for verifying contracts on custom explorers. Thanks to @no2chem for the idea and initial implementation of this feature.

## 3.0.4

### Patch Changes

- e3dcfde4a: Add support for Sepolia (Thanks @pcaversaccio!)

## 3.0.3

### Patch Changes

- 3a037da2: Added `Content-Type` header to `hardhat-etherscan`'s request for verifying contracts, in order to fix [#2437](https://github.com/NomicFoundation/hardhat/issues/2437).

## 3.0.2

### Patch Changes

- 3c2cb707: Add support for the Aurora network to `@nomiclabs/hardhat-etherscan` (thanks @baboobhaiya!)

## 3.0.1

### Patch Changes

- c4fcf19d: Add support for the Moonbeam network

## 3.0.0

### Major Changes

- e04944c6: Support multiple api keys in `hardhat-etherscan` to allow for verification against multiple networks (issue #1448)

### Patch Changes

- ed221fa8: Add support for xDai and Sokol networks

## 2.1.8

### Patch Changes

- 2ae202a2: Add support for verifying contracts in Moonscan
- 2e5d6aeb: Add support for the Avalanche Mainnet and Fuji chains (thanks @marcelomorgado!)

## 2.1.7

### Patch Changes

- d22477f5: Added support for Arbitrum Testnet
- 0b73304b: Add support for FTM testnet.

## 2.1.6

### Patch Changes

- 0ae1c426: hardhat-etherscan: add support for [Arbitrum](https://github.com/OffchainLabs/arbitrum)
