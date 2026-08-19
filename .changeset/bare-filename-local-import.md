---
"hardhat": patch
---

When a Solidity file imports a sibling by bare filename (`import "Storage.sol"`), Hardhat now reports that as a local direct import and suggests `import "./Storage.sol"` instead of a misleading invalid-npm-syntax error.
