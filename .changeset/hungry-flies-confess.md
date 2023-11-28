---
"@nomicfoundation/hardhat-verify": major
---

### Breaking Change:

- **What:** This version deprecates xDai chain mention as the name changed to Gnosis and new chain name already supported with corresponding valid config.
Chiado (Gnosis testnet) urls in chain config were updated.

- **Why:**  Chiado explorer changed domain name, outdated explorer urls leaded to contract verification problems. Gnosis mainnet was oficially renamed.

- **How to Update:** Replace `xdai` chain name in config with `gnosis`.