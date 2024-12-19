// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

contract SendDataEmitter {
  event SendDataEvent(uint256 arg);

  bool public wasEmitted;

  receive() external payable {
    emit SendDataEvent(42);
  }

  function emitEvent() public {
    emit SendDataEvent(42);
  }

  function validateEmitted(uint256 arg) public {
    wasEmitted = true;

    require(arg == 42, "arg is wrong");
  }
}
