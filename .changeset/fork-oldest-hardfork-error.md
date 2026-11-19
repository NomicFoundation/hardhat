---
"hardhat": patch
---

Fixed forking from a block that precedes the oldest supported hardfork being silently accepted. It now fails with an error that names the oldest supported hardfork.
