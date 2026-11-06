---
"@nomicfoundation/hardhat-ignition": patch
"@nomicfoundation/hardhat-errors": patch
---

Fixed `ignition deploy` exiting with code 13 and no error when its confirmation can't be answered: it now reads a piped answer, and fails with an error naming `HARDHAT_IGNITION_CONFIRM_DEPLOYMENT` or `HARDHAT_IGNITION_CONFIRM_RESET` when stdin closes first ([#8792](https://github.com/NomicFoundation/hardhat/issues/8792)).
