pragma solidity ^0.7.0;

contract C {

  function test(uint i) public {
    if (i > 0) {
      test(i - 1);
    }

    revert("base case");
  }

}
