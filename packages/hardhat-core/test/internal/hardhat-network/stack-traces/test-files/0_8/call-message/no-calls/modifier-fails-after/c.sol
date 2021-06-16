pragma solidity ^0.8.0;

contract C {

  modifier mm(bool b) {
    _;



    require(b, "ReqMsg");
  }

  function test(bool b) mm(b) public {
  }

}
