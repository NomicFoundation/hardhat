---
"hardhat": minor
---

Added experimental support for the `amsterdam` hardfork.

Under `amsterdam`, the default `gas` of the Hardhat network is `min(blockGasLimit, 2^32 - 1)`, following EIP-8037. With the default block gas limit that is 60,000,000, up from 16,777,216 under `osaka`.

With a `gasMultiplier`, the automatically estimated gas is no longer trimmed below the node's estimate. This applies to every network and hardfork.
