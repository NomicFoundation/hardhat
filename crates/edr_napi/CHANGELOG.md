# @nomicfoundation/edr

## 0.3.3

### Patch Changes

- 60b2a62: Support hex string as salt in `eth_signTypedData_v4`
- 3ac838b: Fixes detection of Cancun blocks on mainnet
- 7d0f981: Fix node.js runtime freezing on shutdown

## 0.3.2

### Patch Changes

- b13f58a: Fixed failure when retrieving remote code during state modifications (#5000)
- 19eeeb9: Simplified internal set_account_storage_slot API (#5001)

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
