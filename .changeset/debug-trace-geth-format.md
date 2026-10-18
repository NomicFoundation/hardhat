---
"hardhat": minor
---

Changed `debug_traceTransaction` and `debug_traceCall` to follow geth. They accept geth's built-in tracers, such as `callTracer` and `prestateTracer`. Stack items are `0x`-prefixed and unpadded, and storage only appears on steps that access storage.

BREAKING CHANGE: Memory capture is now disabled by default, as in geth. Set the `enableMemory` tracer option to `true` to capture memory.
