---
"hardhat": patch
---

Changed the error of a forking request that fails on every retry. It now reads `Request failed after 9 retries` and no longer names the host or the cause, such as a DNS error.
