---
"hardhat": minor
---

Solidity test configuration now also accepts `{ profiles: { default: ... } }`. Only the `default` profile is currently supported, other profile names will be supported in a future release. The previous flat shape continues to work unchanged.

The resolved `HardhatConfig.test.solidity` is now profile-keyed: read per-profile fields at `hre.config.test.solidity.profiles.default.*` instead of `hre.config.test.solidity.*`. Plugins that read the resolved Solidity test config need to be updated.
