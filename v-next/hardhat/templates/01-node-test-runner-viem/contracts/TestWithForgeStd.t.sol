// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

contract TestContract is Test {
  BrokenContract test;

  function setUp() public {
    test = new BrokenContract();
  }

  function test_ExpectArithmeticError() public {
    vm.expectRevert(stdError.arithmeticError);
    test.forceArithmeticError(10);
  }
}

contract BrokenContract {
  function forceArithmeticError(uint256 a) public pure returns (uint256) {
    return a - 100;
  }
}
