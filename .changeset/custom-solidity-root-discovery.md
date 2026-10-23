---
"hardhat": minor
---

Add `solidity.isRootFile` and `solidity.getScope` hooks so plugins can discover and classify custom source files, such as `.yul`, before handling them in the existing `build` hook. Automatically discovered roots now use the same scope rules as explicitly requested files, including source-directory precedence when source and test paths overlap.
