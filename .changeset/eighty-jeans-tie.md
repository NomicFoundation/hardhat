---
"hardhat": patch
---

- Fixed a bug when using a test filter where the `setUp` function would be run for empty test suites
- Fixed a bug where snapshot cheatcodes would throw an error if names were invalid
- Fixed coverage instrumentation interfering with the single-call `vm.prank` cheatcode
- Added support for instrumentation of Solidity 0.8.35
