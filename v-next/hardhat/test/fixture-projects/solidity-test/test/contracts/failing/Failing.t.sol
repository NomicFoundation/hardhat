// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FailingTest {
  function testFailing() public pure {
    revert("Failing");
  }
}
