---
"hardhat": minor
# docs: https://github.com/NomicFoundation/hardhat-website/pull/285
---

Added experimental EIP-7928 support to the Amsterdam hardfork: blocks on Amsterdam now include the `blockAccessListHash` header field. The value is simulated, not the real `keccak256(rlp(blockAccessList))`.
