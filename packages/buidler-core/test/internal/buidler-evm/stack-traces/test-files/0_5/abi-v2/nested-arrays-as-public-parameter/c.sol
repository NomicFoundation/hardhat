pragma solidity ^0.5.0;

pragma experimental ABIEncoderV2;

import "./../../../../../../../../console.sol";

contract C {

  function printSomething() public {
    console.log("something");
  }

  function doSomething(uint256[][] memory numbers) public returns (uint256) {
    return numbers[0][0];
  }
}
