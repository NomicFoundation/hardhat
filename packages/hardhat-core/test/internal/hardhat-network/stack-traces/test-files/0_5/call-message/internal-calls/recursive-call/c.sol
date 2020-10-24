pragma solidity ^0.5.0;

contract C {

  function test(uint i) public {
    if (i > 0) {
      test(i - 1);
    }

    revert("base case");
  }

}