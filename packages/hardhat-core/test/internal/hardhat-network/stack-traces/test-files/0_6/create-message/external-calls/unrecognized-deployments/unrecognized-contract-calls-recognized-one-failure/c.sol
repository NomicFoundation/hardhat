pragma solidity ^0.6.0;

import "./d.sol";

contract IgnoredC  {

  constructor() public {
    D d = new D();
    d.fail();
  }

}

