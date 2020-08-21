pragma solidity ^0.7.0;

contract C {

  function test() public {
    fail();
  }

  modifier mod {

    _;
    revert("mod failed after");
  }

  function fail() mod internal {

  }
}
