// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// A self-contained fuzz test (no forge-std) whose run count comes from the
// selected test profile's `fuzz.runs`, used to exercise --test-profile
// end-to-end.
contract ProfilesTest {
  function testFuzzProfileRuns(uint256 x) public pure {}
}
