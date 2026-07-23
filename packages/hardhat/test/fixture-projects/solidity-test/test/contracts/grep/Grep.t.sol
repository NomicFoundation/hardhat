// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// A self-contained suite (no forge-std) with distinctly named passing tests,
// used to exercise --grep / --grep-exclude filtering end-to-end.
contract GrepTest {
  function testAlpha() public pure {}

  function testBeta() public pure {}

  function testGamma() public pure {}
}
