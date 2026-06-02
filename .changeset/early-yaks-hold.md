---
"@nomicfoundation/hardhat-verify": patch
---

Reject `verify` invocations against local dev networks (chain id 31337 or 1337),surfacing `NETWORK_NOT_SUPPORTED` error instead of letting the downstream explorer client fail cryptically.
