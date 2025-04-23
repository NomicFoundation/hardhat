---
"hardhat": patch
---

Generate better error messages when invoking unsupported cheatcodes. Previously we'd just return "unknown selector 0xafc98040", now we return "cheatcode 'broadcast()' is not supported" instead.
