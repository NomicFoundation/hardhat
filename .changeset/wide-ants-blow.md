---
"hardhat": patch
---

Validate `initialDate` is a parseable date string at config-load time, avoids BigInt(NaN) crash.
