// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Callee {
  function ping() public pure returns (uint256) {
    return 1;
  }
}

contract TracesTest {
  Callee callee = new Callee();

  function test_Passes() public view {
    callee.ping();
  }

  function test_Fails() public view {
    callee.ping();
    revert("Failing");
  }
}
