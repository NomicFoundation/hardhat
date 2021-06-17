pragma solidity ^0.8.1;

import "./../../../../../../../../console.sol";

contract C {
  uint x;

  function test() public {
    try this.set() {} catch Error(string memory reason) {
      console.log(reason);
    }
  }

  function set() public {
    x = 1 / x;
  }
}
