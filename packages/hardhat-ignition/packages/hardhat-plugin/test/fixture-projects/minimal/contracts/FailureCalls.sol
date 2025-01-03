// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract FailureCalls {
  bool public success;

  function fails() public {
    success = false;
    revert("fails");
  }

  function doesNotFail() public {
    // modify the state so the function isn't pure/view
    success = true;
  }
}
