pragma solidity ^0.7.0;

import "./d.sol";

contract IgnoredC  {

  constructor() public {
    D d = new D();
    d.fail();
  }

}

