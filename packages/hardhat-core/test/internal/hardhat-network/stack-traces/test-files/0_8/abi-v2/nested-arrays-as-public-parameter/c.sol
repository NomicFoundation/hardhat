pragma solidity ^0.8.0;


import "./../../../../../../../../console.sol";

contract C {

  function printSomething() public {
    console.log("something");
  }

  function doSomething(uint256[][] memory numbers) public returns (uint256) {
    return numbers[0][0];
  }
}
