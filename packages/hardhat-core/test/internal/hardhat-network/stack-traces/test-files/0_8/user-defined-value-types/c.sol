pragma solidity ^0.8.8;

import "./../../../../../../../console.sol";

type UFixed is uint256;

contract C {
  function f(UFixed a) public returns (UFixed b) {
    console.log("something");
    b = a;
  }
}
