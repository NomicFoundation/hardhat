---
"@nomicfoundation/hardhat-utils": patch
"hardhat": patch
---

Started using streams when handling the solc compiler outputs to support compilation of very large codebases where the compilation outputs might exceed the maximum buffer size/string length.
