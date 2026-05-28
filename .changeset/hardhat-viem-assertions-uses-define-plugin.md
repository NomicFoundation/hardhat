---
"@nomicfoundation/hardhat-viem-assertions": patch
---

The plugin now uses `definePlugin` from `hardhat/plugins` in its `index.ts`, so it participates in Hardhat's new "imported but unused plugin" warning when omitted from a project's `plugins` array.
