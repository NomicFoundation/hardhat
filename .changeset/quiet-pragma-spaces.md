---
"hardhat": patch
---

Fixed Solidity version matching so pragmas with insignificant whitespace (e.g. `^ 0.8 .0`) select a compatible compiler instead of failing with HHE909.
