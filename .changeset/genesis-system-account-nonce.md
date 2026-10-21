---
"hardhat": patch
---

Fixed the EIP-4788 and EIP-2935 system accounts to have nonce `1` in the genesis state, matching their on-chain deployments. The genesis block hash of local Cancun or later networks therefore differs from previous Hardhat versions. The hashes of all later blocks change as well.
