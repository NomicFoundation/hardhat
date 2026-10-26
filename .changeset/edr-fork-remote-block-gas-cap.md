---
"hardhat": patch
---

Fixed calls and gas estimates at the fork block and earlier blocks of a forked network being checked against the transaction gas cap of the local network instead of the cap of the remote chain's hardfork at that block; replays by `debug_traceCall` and `debug_traceTransaction` at those blocks use it too.
