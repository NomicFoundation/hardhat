// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract InlineConfigTest {
  /// forge-config: default.fuzz.runs = 7
  function testFuzzWithInlineConfig(uint256 x) public pure {
    // Always passes; the inline config directive above caps the fuzz runs,
    // which the test asserts through the reported number of runs.
  }

  function testFuzzWithoutInlineConfig(uint256 x) public pure {
    // Always passes; runs with the default number of fuzz runs.
  }
}
