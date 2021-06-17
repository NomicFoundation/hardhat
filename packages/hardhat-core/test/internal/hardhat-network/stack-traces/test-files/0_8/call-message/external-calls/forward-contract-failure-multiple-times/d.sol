pragma solidity ^0.8.0;

import "./e.sol";

contract D {

  function callE() public {
    E e = new E();

    e.fail();
  }

}
