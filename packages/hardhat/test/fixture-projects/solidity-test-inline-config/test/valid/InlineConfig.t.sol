// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "dependency/src/BaseTest.sol";

contract InlineConfigTest is BaseTest {
  /// forge-config: default.fuzz.runs = 7
  function testFuzzWithInlineConfig(uint256 x) public pure {
    // Always passes; the directive above caps the fuzz runs at 7, which the
    // integration test verifies via the reported run count.
  }

  function testFuzzWithoutInlineConfig(uint256 x) public pure {
    // Always passes; runs with the default number of fuzz runs.
  }
}
