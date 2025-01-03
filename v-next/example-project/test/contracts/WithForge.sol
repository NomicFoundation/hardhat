// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import "forge-std/Test.sol";

contract TestContract is Test {
  ErrorsTest test;

  function setUp() public {
    test = new ErrorsTest();
  }

  function testExpectArithmetic() public {
    vm.expectRevert(stdError.arithmeticError);
    test.arithmeticError(10);
  }
}

contract ErrorsTest {
  function arithmeticError(uint256 a) public pure returns (uint256) {
    return a - 100;
  }
}
