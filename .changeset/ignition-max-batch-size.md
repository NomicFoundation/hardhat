---
# docs: https://github.com/NomicFoundation/hardhat-website/pull/315
"@nomicfoundation/ignition-core": minor
"@nomicfoundation/hardhat-ignition": minor
"@nomicfoundation/hardhat-errors": patch
---

Add an optional `ignition.maxBatchSize` setting to split deployment batches while preserving dependency boundaries. Resume pending transactions in nonce order before starting new futures, including when reducing the batch limit between runs. The `batches` helper also accepts an optional maximum batch size.
