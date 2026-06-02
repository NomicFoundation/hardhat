---
"@nomicfoundation/hardhat-verify": patch
---

Replace three user-reachable `assertHardhatInvariant` calls in `artifacts.ts` with descriptive `HardhatError`s so users see actionable messages instead of HH900.
