pragma solidity ^0.7.0;

contract C {

  function test() public {
    fail();
  }

  modifier mod {
    revert("mod failed before");
    _;
  }

  function fail() mod internal {
    revert("fail");
  }
}
