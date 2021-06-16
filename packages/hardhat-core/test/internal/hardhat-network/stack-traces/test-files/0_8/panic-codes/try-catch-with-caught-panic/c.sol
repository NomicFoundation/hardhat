pragma solidity ^0.8.1;

import "./../../../../../../../../console.sol";

contract C {
  uint x;

  function test() public {
    try this.set() {} catch Panic(uint code) {
      console.log(code);
    }
  }

  function set() public {
    x = 1 / x;
  }
}
