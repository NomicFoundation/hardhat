---
"hardhat": patch
---

Fixed a problem related to configured accounts during forking. Some of them may be delegated in mainnet, making them unusable for local development. They are now undelegated after forking to turn them into normal EOAs.
