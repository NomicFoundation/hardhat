---
"@nomicfoundation/hardhat-verify": minor
---

Added support for an optional `apiKey` in the `verify.blockscout` config, which is sent as the `apikey` query param of the Blockscout verification requests. This is required by Blockscout instances that don't expose a keyless API, like the Pro API.
