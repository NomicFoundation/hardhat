pragma solidity ^0.5.0;

contract D {

  function () payable external {
    revert("D failed");
  }

}
