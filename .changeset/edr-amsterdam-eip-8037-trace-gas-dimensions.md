---
"hardhat": minor
---

Thanks @anaPerezGhiglia! Added the EIP-8037 gas dimensions to `debug_traceTransaction` and `debug_traceCall` from the Amsterdam hardfork: the default tracer's top-level frame and the `callTracer`'s root call frame report `executionGasUsed`, `stateGasUsed` and `gasRefund`, and each `structLogs` entry reports `stateGasReservoir`, plus a signed `stateGasCost` on the steps that charge or refill state gas.
