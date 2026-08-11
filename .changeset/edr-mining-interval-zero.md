---
"hardhat": patch
---

Fixed the EDR network config validation rejecting `mining.interval: 0`, a valid value which disables interval mining.
