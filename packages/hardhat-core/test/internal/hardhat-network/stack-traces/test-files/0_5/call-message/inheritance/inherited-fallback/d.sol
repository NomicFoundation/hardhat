pragma solidity ^0.5.0;

contract D {

  function () external {
    revert("inherited fallback");
  }

}