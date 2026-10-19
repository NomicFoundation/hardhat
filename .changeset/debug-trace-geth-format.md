---
"hardhat": minor
---

Changed `debug_traceTransaction` and `debug_traceCall` to return geth's format unchanged. They accept geth's built-in tracers, such as `callTracer` and `prestateTracer`. Stack items, storage keys and storage values are `0x`-prefixed and unpadded. Storage only appears on steps that access storage. The `returnValue` is a `0x`-prefixed hex string, which is `0x` when empty.

BREAKING CHANGE: Memory capture is now disabled by default, as in geth. Set the `enableMemory` tracer option to `true` to capture memory.
