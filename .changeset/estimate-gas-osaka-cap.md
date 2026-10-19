---
"hardhat": patch
---

Fixed `eth_estimateGas` failing from the Osaka hardfork when its search probed gas values above the EIP-7825 transaction gas cap.
