---
"hardhat": minor
---

Kept the default tracer's Hardhat 2 format in `debug_traceTransaction` and `debug_traceCall`. Stack items, memory words, storage keys and storage values stay unprefixed and zero-padded. Memory is still captured unless `disableMemory` is set. Storage still appears on every step unless `disableStorage` is set.

Added support for geth's built-in tracers, such as `callTracer` and `prestateTracer`. These tracers return geth's output unchanged. The new `enableMemory` option takes precedence over `disableMemory`.

The default tracer output differs in a few places. A step that halts now has an `error` message that comes from EDR, so do not match on its exact text. An unknown opcode is now named `Unknown`. A `STOP` at the first step is no longer dropped, so traces can have one more step. Storage no longer shows slots of another contract after a warm `SLOAD`. When `disableStack` is set, storage values can be stale until the next `SLOAD` or `SSTORE`.
