pragma solidity 0.5.15;

import "./ReentrancyGuard.sol";

contract TestReentrancyGuardLocal is ReentrancyGuard {

  function foo() public nonReentrant returns(uint) {
    return 1;
  }
}