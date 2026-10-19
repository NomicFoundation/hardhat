---
"hardhat": patch
---

Fixed `networks.hardhat.chains` hardfork histories being ignored when forking.
They are now passed to EDR and replace its built-in activations for that chain.
Removed the remaining default hardfork histories, because EDR's own tables cover those chains.
