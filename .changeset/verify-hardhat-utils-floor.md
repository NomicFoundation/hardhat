---
"@nomicfoundation/hardhat-verify": patch
---

Fixed an empty `bytes` constructor argument being encoded as one zero byte when an older `@nomicfoundation/hardhat-utils` was installed, by requiring 5.1.1 or later.
