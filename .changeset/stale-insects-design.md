---
"hardhat": patch
---

feat: bump @ignored/edr to 0.10.0-alpha.2. This brings two improvements:

1. Better error messages when invoking unsupported cheatcodes. Previously we'd just return "unknown selector 0xafc98040", now we return "cheatcode 'broadcast()' is not supported" instead.
2. Automatically linking libraries for Solidity tests.
