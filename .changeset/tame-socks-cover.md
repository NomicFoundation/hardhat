---
"@nomicfoundation/hardhat-ignition": patch
"@nomicfoundation/ignition-core": patch
---

Added support for verifying on all enabled verification services ([#7967](https://github.com/NomicFoundation/hardhat/pull/7967)).

The `SuccessfulDeploymentExecutionResult` type in `@nomicfoundation/ignition-core` now includes a `creationTxHash` field to support verification services that require it (e.g. Sourcify).
