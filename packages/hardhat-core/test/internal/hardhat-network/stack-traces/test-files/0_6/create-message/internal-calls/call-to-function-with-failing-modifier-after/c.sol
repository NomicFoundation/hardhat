pragma solidity ^0.6.0;

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
