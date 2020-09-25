pragma solidity ^0.6.0;

contract C {

  modifier mm(bool b) {
    _;



    require(b, "ReqMsg");
  }

  function test(bool b) mm(b) public {
  }

}
