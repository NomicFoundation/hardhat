---
"hardhat": minor
---

Hardhat now warns when a plugin is imported in `hardhat.config.ts` but missing from the `plugins` array. The warning is printed to stderr after the runtime environment is created, listing the offending plugins and pointing the user at the fix.

For the warning to be reliable, your project's `tsconfig.json` must enable `verbatimModuleSyntax: true`. Without it, TypeScript deletes unused default-value imports, so an unused plugin can't be detected.
