// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// The invalid inline config directive makes the test run fail before any test
// is executed, which is used to exercise how the task reports runner errors.
contract InvalidInlineConfigTest {
  /// forge-config: default.not-a-key = 1
  function testInvalidInlineConfig() public pure {}
}
