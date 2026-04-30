---
"@nomicfoundation/hardhat-viem-assertions": minor
---

Type-narrow event and custom-error assertions from the contract's ABI:
`emit` / `emitWithArgs` / `revertWithCustomError` /
`revertWithCustomErrorWithArgs` now infer event/error names from
`contract.abi` (with autocomplete), and `expectedArgs` is typed as the
matching input tuple — each position can also be a `(value) => boolean`
predicate.
