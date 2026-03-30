---
"@nomicfoundation/hardhat-errors": patch
"hardhat": patch
---

Introduce the `ConfigHooks#validateResolvedConfig` hook and the `HardhatConfigValidationError` type to be able to run global validations on the resolved config ([#8008](https://github.com/NomicFoundation/hardhat/pull/8008)).
