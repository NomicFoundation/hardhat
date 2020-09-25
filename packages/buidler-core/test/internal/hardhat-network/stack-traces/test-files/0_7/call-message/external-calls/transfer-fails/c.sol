pragma solidity ^0.7.0;

import "./d.sol";

contract C {

  function test() payable public {
    D d = new D();
    address(d).transfer(1);
  }

}
