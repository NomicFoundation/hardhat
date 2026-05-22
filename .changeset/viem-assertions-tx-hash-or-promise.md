---
"@nomicfoundation/hardhat-viem-assertions": minor
---

The assertions `balancesHaveChanged`, `emit`, and `emitWithArgs` now accept either a promise or its already-awaited value, so `await contract.write.foo()` can be passed directly.

`emit` and `emitWithArgs` now only look at logs produced by the specific transaction passed in (via its receipt) instead of every log ever emitted by the contract address. Tests that previously passed by matching events from other transactions on the same contract will now correctly fail.

The `contractFn` parameter of `emit` and `emitWithArgs` has been narrowed accordingly: it no longer accepts `ReadContractReturnType` (reads don't produce a receipt). Existing code passing a read result was already a no-op against the contract's logs and would not have produced a meaningful assertion.
