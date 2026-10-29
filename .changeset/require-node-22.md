---
"hardhat": minor
---

Updated the minimal supported version of Node to v22, because EDR declares `engines.node >= 22`. Node 20 reached end of life on 2026-04-30.

On Node 20, Hardhat prints its unsupported-version warning and keeps running. Hardhat's own `package.json` declares no `engines`, so installing it is not blocked. Package managers warn that `@nomicfoundation/edr` requires Node 22, and those that enforce `engines`, such as Yarn 1, refuse the install. EDR's loader has no Node version check, so EDR itself still loads on Node 20, but that combination is untested.
