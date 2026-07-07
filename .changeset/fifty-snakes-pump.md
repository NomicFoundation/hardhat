---
"hardhat": minor
---

Add support for the new experimental `amsterdam` L1 hardfork, which currently implements EIP-7708 (ETH transfers emit logs). It's opt-in via the `hardfork` config and is not the default — the latest stable hardfork remains `osaka`. Selecting `amsterdam`, or any hardfork beyond the latest stable one, now prints a warning that it's experimental and may change.
