---
"hardhat": patch
---

Make `eth_getStorageAt` spec-compliant. This means that the storage slot argument **must** have a length of 32 bytes (a hex-encoded string of length 66).
