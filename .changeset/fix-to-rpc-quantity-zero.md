---
"@nomicfoundation/hardhat-network-helpers": patch
---

Fixed the conversion of zero-padded zero strings such as `"0x00"` in the network helpers, which was producing an invalid `"0x"` quantity and made `mineUpTo`, `time.increase` and `time.increaseTo` fail with a confusing `Cannot convert 0x to a BigInt` error.
