---
@nomicfoundation/edr: path
---

fix: When in fork mode and executing a call in the block immediately preceding the fork, make sure that the hardfork for EVM execution is derived from the block number as opposed to the provider config.
