pragma solidity ^0.8.8;

type UFixed is uint256;

contract C {
  function f(UFixed a) public returns (UFixed b) {
    require(false, "error reason");
    b = a;
  }
}
