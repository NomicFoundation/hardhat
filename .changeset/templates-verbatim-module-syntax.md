---
"hardhat": patch
---

The sample projects initialized with `hardhat --init` now set `verbatimModuleSyntax: true` in their `tsconfig.json`. This ensures that plugin imports in `hardhat.config.ts` are actually evaluated at runtime, which is required for the new "imported but unused plugin" warning to work reliably.
