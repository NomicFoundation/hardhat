pragma solidity ^0.7.0;

contract C {

  function test() public {
    fail();
  }

  modifier mod {
    _;
  }

  function fail() mod internal {
    revert("fail");
  }
}
