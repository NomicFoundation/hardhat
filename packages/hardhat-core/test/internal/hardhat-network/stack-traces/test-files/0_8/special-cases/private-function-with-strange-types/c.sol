pragma solidity ^0.8.0;

import "./../../../../../../../../console.sol";

contract C {

  function printSomething() public {
    console.log("something");
  }

  // This tests our AST parsing logic.
  // Having custom types on private or internal functions shouldn't be a problem.
  struct CustomType {
    bytes32 whatever;
  }

  function receiveCustomType(CustomType storage something) private view {}
  function anotherReceiveCustomType(CustomType storage something) internal view {}
}
