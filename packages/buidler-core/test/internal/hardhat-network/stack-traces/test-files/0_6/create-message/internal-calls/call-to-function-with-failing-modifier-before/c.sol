pragma solidity ^0.6.0;

contract C {

  constructor() public {
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
