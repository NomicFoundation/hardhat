---
"hardhat": patch
---

Fixed the EDR network config validation rejecting `mining.interval: 0`, which disables interval mining and is also the resolved default.
