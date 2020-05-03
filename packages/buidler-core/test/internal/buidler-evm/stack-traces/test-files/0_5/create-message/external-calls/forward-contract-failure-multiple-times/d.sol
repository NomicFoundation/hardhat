pragma solidity ^0.5.0;

import "./e.sol";

contract D {

  function callE() public {
    E e = new E();

    e.fail();
  }

}
