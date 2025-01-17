// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

contract TupleEmitter {
  bool public arg1Captured;
  bool public arg2Captured;

  event TupleEvent(bool arg1, uint256 arg2);

  function emitTuple() public {
    emit TupleEvent(true, 1234);
  }

  function verifyArg1(bool arg) public returns (uint256 output) {
    arg1Captured = true;

    require(arg == true, "arg1 is wrong");

    return 1;
  }

  function verifyArg2(uint256 arg) public returns (uint256 output) {
    arg2Captured = true;

    require(arg == 1234, "arg2 is wrong");

    return 1;
  }
}
