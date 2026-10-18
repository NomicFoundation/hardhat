---
"hardhat": patch
---

Make the Solidity build system compare filesystem paths as paths, instead of as raw string prefixes, when it decides whether a file belongs to the Solidity sources or tests scope. This fixes the scope of a file being reported incorrectly when its path is spelled differently from the configured sources or tests path, for example with `/` separators, a trailing separator, or a different letter case on Windows.
