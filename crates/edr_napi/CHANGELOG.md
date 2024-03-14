# @nomicfoundation/edr

## 0.3.1

### Patch Changes

- 591b7c5: Fixed failing RPC requests for certain providers due to missing content-type header (#4992)

## 0.3.0

### Minor Changes

- ac155d6: Bump Rust to v1.76

### Patch Changes

- 87da82b: Fixed a problem when forking networks with non-standard transaction types (#4963)
- 5fe1728: Fixed a bug in `hardhat_setStorageAt` that occured when the storage of a remote contract was modified during forking (#4970)
- 0ec305f: Fixed a bug in `hardhat_dropTransaction` where empty queues persisted and caused panics
- a5071e5: Fixed a bug in `eth_estimateGas` where a call would fail because the nonce was being checked
