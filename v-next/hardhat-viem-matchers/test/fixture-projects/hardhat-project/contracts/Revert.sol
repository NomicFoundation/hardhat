// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Revert {
  //
  // Custom errors
  //
  error CustomError();
  error CustomErrorWithInt(int);
  error CustomErrorWithUintAndString(uint, string);

  function alwaysRevert() external pure {
    revert("Intentional revert for testing purposes");
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
