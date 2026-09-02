---
# docs: https://github.com/NomicFoundation/hardhat-website/pull/297
"@nomicfoundation/hardhat-errors": patch
"hardhat": minor
---

Added support for Solidity Test Profiles. You can now declare several sets of Solidity test settings under `test.solidity.profiles` and choose between them with the `--test-profile` argument or the `HARDHAT_TEST_PROFILE` environment variable. Each profile is configured independently, and a `default` profile is required.

Inline test configuration directives can now be scoped to a profile, so `/// hardhat-config: ci.fuzz.runs = 10000` only applies when the `ci` profile is selected, while an unprefixed directive applies under every profile.
