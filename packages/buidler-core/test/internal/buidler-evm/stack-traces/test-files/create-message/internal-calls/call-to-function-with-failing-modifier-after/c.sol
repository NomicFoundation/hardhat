pragma solidity ^0.5.0;

contract C {

  constructor() public {
    fail();
  }

  modifier mod {

    _;
    revert("mod failed after");
  }

  function fail() mod internal {

  }
}