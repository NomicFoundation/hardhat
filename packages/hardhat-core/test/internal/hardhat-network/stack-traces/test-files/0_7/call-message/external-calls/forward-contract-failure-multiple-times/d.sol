pragma solidity ^0.7.0;

import "./e.sol";

contract D {

  function callE() public {
    E e = new E();

    e.fail();
  }

}
