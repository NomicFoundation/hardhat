// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

struct TestStruct {
  uint a;
  uint b;
}

contract Revert {
  //
  // Custom errors
  //
  error CustomError();
  error CustomErrorWithInt(int);
  error CustomErrorWithUintAndString(uint, string);
  error CustomErrorWithUintAndStringNamedParam(uint u, uint v, string s);
  error CustomErrorWithArray(uint[]);
  error CustomErrorWithStruct(TestStruct);

  function alwaysRevert() external pure {
    revert("Intentional revert for testing purposes");
  }

  function alwaysRevertWithNoReason() external pure {
    revert();
  }

  function doNotRevert() external pure {}

  function revertWithCustomError() external pure {
    revert CustomError();
  }

  function revertWithCustomErrorWithInt(int i) external pure {
    revert CustomErrorWithInt(i);
  }

  function revertWithCustomErrorWithUintAndString(
    uint n,
    string memory s
  ) external pure {
    revert CustomErrorWithUintAndString(n, s);
  }

  function revertWithCustomErrorWithUintAndStringNamedParam(
    uint u,
    uint v,
    string memory s
  ) external pure {
    revert CustomErrorWithUintAndStringNamedParam(u, v, s);
  }

  function revertWithCustomErrorWithArray(uint[] memory a) external pure {
    revert CustomErrorWithArray(a);
  }

  function revertWithCustomErrorWithStruct(TestStruct memory a) external pure {
    revert CustomErrorWithStruct(a);
  }
}

contract RevertWithNestedError {
  Revert public revertContract;

  constructor() {
    revertContract = new Revert();
  }

  function nestedRevert() external view {
    revertContract.alwaysRevert();
  }

  function nestedCustomRevert() external view {
    revertContract.revertWithCustomError();
  }

  function nestedRevertWithCustomErrorWithInt() external view {
    revertContract.revertWithCustomErrorWithInt(1);
  }
}
