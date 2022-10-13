pragma solidity 0.5.15;

import "./imported/ReentrancyGuard.sol";

contract TestReentrancyGuardImported is ReentrancyGuard {

  function foo() public nonReentrant returns(uint) {
    return 0;
  }
}