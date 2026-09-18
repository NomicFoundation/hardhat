---
"@nomicfoundation/hardhat-errors": patch
"@nomicfoundation/hardhat-utils": patch
"hardhat": patch
---

Fixed invalid `HTTPS_PROXY`/`HTTP_PROXY` values being reported as unexpected errors instead of a Hardhat error.
