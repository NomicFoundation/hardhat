---
"@nomicfoundation/hardhat-network-helpers": patch
---

Network helpers - fixture error

Fixed an error in `hardhat-network-helpers` where the blockchain `snapshot` was being shared across different connections. Now, each connection has its own `snapshot`.
