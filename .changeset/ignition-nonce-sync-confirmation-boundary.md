---
"@nomicfoundation/ignition-core": patch
---

Fixed an off-by-one in Ignition's nonce sync that could let a deployment continue when a user's replacement transaction had one fewer than the required number of confirmations.
