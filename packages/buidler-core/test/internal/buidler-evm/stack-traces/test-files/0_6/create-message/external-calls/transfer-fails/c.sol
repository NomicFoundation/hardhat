pragma solidity ^0.6.0;

import "./d.sol";

contract C {

  constructor() payable public {
    D d = new D();
    address(d).transfer(1);
  }

}
