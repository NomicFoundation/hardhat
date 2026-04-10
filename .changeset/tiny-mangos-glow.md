---
"hardhat": patch
---

Update the default outputSelection setting of solc to decrease the artifacts size.

NOTE: This change can lead to build info ids changing, despite compilation output's bytecodes being identical.
