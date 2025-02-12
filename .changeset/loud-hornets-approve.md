---
"@ignored/hardhat-vnext": patch
---

feat: bump `@ignored/edr` to 0.8.0-alpha.2
- Stack traces for setup, deployment, fuzz and invariant tests.
- The stack traces are generated via re-execution of failing tests. This means that there is no performance penalty on the happy path.
