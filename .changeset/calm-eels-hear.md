---
"hardhat": patch
---

Bumped EDR version to [`0.12.0-next.25`](https://github.com/NomicFoundation/edr/releases/tag/%40nomicfoundation%2Fedr%400.12.0-next.25).

### Minor Changes
- NomicFoundation/edr@3974769: Added `callTraces()` to `Response` object, inclusion of which is configurable through the `includeCallTraces` option on the `ObservabilityConfig`
- NomicFoundation/edr@f4bdc36: Removed `getLatestSupportedSolcVersion` API

  BREAKING CHANGE: A new API `latestSupportedSolidityVersion` was previously introduced to replace the deprecated `getLatestSupportedSolcVersion`. The old API has now been removed. Users should update their code to use `latestSupportedSolidityVersion` instead.

- NomicFoundation/edr@3974769: Removed `traces()` API from the `Response` object
- NomicFoundation/edr@f4bdc36: Added support to the `debug_traceCall` & `debug_traceTransaction` JSON-RPC methods for different tracers (`4byteTracer`, `callTracer`, `flatCallTracer`, `prestateTracer`, `noopTracer`, and `muxTracer`).

  Our API is now aligned with Geth's tracing capabilities.

  BREAKING CHANGE: Memory capture used to be enabled by default on geth, but has since been flipped <https://github.com/ethereum/go-ethereum/pull/23558> and is now disabled by default. We have followed suit and disabled it by default as well. If you were relying on memory capture, you will need to explicitly enable it by setting the `enableMemory` option to `true` in your tracer configuration.
