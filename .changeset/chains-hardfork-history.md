---
"hardhat": patch
---

- Fixed `networks.hardhat.chains` hardfork histories being ignored.
- Changed a configured hardfork history to replace EDR's built-in activations for that chain, so it must list every hardfork the forked range needs.
- Removed the default `networks.hardhat.chains` entry for Sepolia.
