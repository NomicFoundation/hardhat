---
"hardhat": patch
---

Stopped including the resolved value of a configuration variable in the errors thrown when it isn't a valid URL, BigInt or hex string. These errors now identify the variable by name only. The error thrown for an invalid network URL no longer includes the URL either, and identifies the network by name instead.
