---
"hardhat": patch
---

Fixed HH411 reporting a truncated scoped npm package name when a library import omitted the second path segment (for example `@hardhat/console.sol`).