---
"@nomiclabs/hardhat-vyper": patch
---

Added a check to validate that the Brownie code does not contain the directive `#@ if mode == "test":` because we currently do not support this feature.
