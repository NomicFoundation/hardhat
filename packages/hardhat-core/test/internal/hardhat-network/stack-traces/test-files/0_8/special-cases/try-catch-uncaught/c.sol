pragma solidity ^0.8.1;

contract C {
  function test() public {
    try this.fail() {} catch Panic(uint code) {}
  }

  function fail() public {
    require(false, "failure reason");
  }
}
