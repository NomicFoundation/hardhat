---
"hardhat": minor
---

Updated `debug_traceTransaction` and `debug_traceCall`:

- Added support for geth's built-in tracers, such as `callTracer` and `prestateTracer`, which return geth's output unchanged.
- Fixed an empty `tracer` to select the default tracer, as the Ethereum execution API spec requires.
- Added the `enableMemory` and `enableReturnData` options to the default tracer. `enableMemory` takes precedence over `disableMemory`, and `enableReturnData` adds `returnData` to each step.
- Changed the default tracer output in a few places:
  - A step that halts now has an `error` message that comes from EDR, so do not match on its exact text.
  - An unknown opcode is now named `Unknown`.
  - A `STOP` at the first step is no longer dropped, so traces can have one more step.
  - Storage no longer shows slots of another contract after a warm `SLOAD`.
  - When `disableStack` is set, storage values can be stale until the next `SLOAD` or `SSTORE`.
  - With the default tracer and storage enabled, `debug_traceTransaction` now reads the traced transaction to find its recipient. That costs one remote request when the transaction is on a forked chain.
