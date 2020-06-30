pragma solidity ^0.6.0;

import "./d.sol";

contract C {

  function test() public payable {
    D d = new D();

    d.test2{value: 2}();
  }

}
