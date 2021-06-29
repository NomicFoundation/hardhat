pragma solidity ^0.8.0;

import "./d.sol";

contract C {

  constructor() public {
    D d = new D();
    d.fail();
  }

}
