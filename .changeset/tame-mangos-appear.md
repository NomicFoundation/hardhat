---
"@nomiclabs/hardhat-truffle4": patch
"@nomiclabs/hardhat-truffle5": patch
"@nomiclabs/hardhat-vyper": patch
---

Improve the compilation performance by not using the `glob` library whenever we can avoid it.
