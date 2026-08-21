// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract InvalidInlineConfigTest {
  /// forge-config: default.fuzz.runs = not-a-number
  function testFuzzWithInvalidInlineConfig(uint256 x) public pure {
    // Never runs: the invalid inline config directives in this contract make
    // the test run fail before any test is executed.
  }

  /// forge-config: default.not-a-key = 1
  function testFuzzWithInvalidInlineConfigKey(uint256 x) public pure {
    // Never runs, for the same reason as above.
  }
}
