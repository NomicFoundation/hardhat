---
"hardhat": patch
---

Thanks @anaPerezGhiglia! Fixed blocks mined on a fork using default blob and base fee parameters instead of the forked chain's when the configured `chainId` differs from the remote chain's.
