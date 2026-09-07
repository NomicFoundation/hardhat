// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Every test here passes; the assertions are on the reported run counts, which
// depend on the selected test profile.
contract InlineConfigProfilesTest {
  // No profile prefix, so it applies under every profile.
  /// hardhat-config: fuzz.runs = 3
  function testFuzzUnprefixed(uint256 x) public pure {}

  // Under `ci` the prefixed directive wins, even though it's written first.
  /// hardhat-config: ci.fuzz.runs = 8
  /// hardhat-config: fuzz.runs = 3
  function testFuzzProfileWinsOverUnprefixed(uint256 x) public pure {}

  // Applies only under `default`; other profiles use the file config.
  /// hardhat-config: default.fuzz.runs = 4
  function testFuzzDefaultProfileOnly(uint256 x) public pure {}
}
