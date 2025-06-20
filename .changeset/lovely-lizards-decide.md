---
"hardhat": patch
---

Combined and upgraded EDR dependencies to @ignored/edr v0.13.0-alpha.5:
- Replaced `Buffer` with `Uint8Array` in Solidity tests interface
- Removed `runSolidityTests` method
- Added `EdrContext::registerSolidityTestRunnerFactory` and `EdrContext::runSolidityTests` functions as multi-chain alternative to `runSolidityTests`
- Added the ability to request execution traces for Solidity tests for either all tests or just failing tests
