// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract InvalidInlineConfigTest {
  /// forge-config: default.fuzz.runs = not-a-number
  function testFuzzWithInvalidInlineConfig(uint256 x) public pure {
    // Never runs: the invalid inline config directive above makes the test
    // run fail before any test is executed.
  }
}
