# @nomicfoundation/hardhat-ledger

## 3.0.2

### Patch Changes

- 228f32c: Fixed reconnection when Ledger device is unplugged/replugged during operations ([#7896](https://github.com/NomicFoundation/hardhat/issues/7896))
- 076895f: Handled locked or the Ethereum App not being opened errors by adding a wait and retry ([#7905](https://github.com/NomicFoundation/hardhat/pull/7905))
- 6afeb03: Fixed the `hardhat-ledger` bug for networks where the `eth_accounts` method is not supported ([#7885](https://github.com/NomicFoundation/hardhat/pull/7885))

## 3.0.1

### Patch Changes

- d053490: Fixed a bug in `hardhat-ledger` where the `derivationFunction` parameter was being ignored ([7682](https://github.com/NomicFoundation/hardhat/pull/7682)).

## 3.0.0

### Major Changes

- a7686bd: Update `hardhat-ledger` to support Hardhat 3 ([#7272](https://github.com/NomicFoundation/hardhat/issues/7272))

## 1.2.1

### Patch Changes

- 558ac5b: Update installation and config instructions
