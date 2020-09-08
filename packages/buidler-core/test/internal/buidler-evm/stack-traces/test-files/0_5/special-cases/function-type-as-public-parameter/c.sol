pragma solidity ^0.5.0;

import "./../../../../../../../../console.sol";

contract C {

  function printSomething() public {
    console.log("something");
  }

  function proxyMessageCall(function (uint256) external returns (uint256) aFunction, uint256 aParameter) public returns (uint256) {
    return aFunction(aParameter);
  }
}
