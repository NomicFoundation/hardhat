// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma solidity *;

contract FailingContract {
  error CustomError();
  error CustomErrorWithUintAndString(uint, string);

  function fail() public pure {
    innerRevert();
  }

  function innerRevert() internal pure {
    revert("Revert Message");
  }

  function failByRevertWithCustomError() external pure {
    revert CustomError();
  }

  function failByRevertWithCustomErrorWithUintAndString(
    uint n,
    string memory s
  ) external pure {
    revert CustomErrorWithUintAndString(n, s);
  }
}
