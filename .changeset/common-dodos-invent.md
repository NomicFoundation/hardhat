---
"hardhat": patch
---

Upgraded EDR to [v0.11.2](https://github.com/NomicFoundation/edr/releases/tag/%40nomicfoundation%2Fedr%400.11.2):

- Removed copying of account code for provider accounts in forked networks. Code was previously ignored for default accounts only, now also for user accounts.
