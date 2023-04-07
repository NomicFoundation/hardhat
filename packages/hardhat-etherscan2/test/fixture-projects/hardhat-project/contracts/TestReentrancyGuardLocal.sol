pragma solidity 0.5.15;

import "./ReentrancyGuard.sol";

contract TestReentrancyGuardLocal is ReentrancyGuard {
  string message = "placeholder";

  function foo() public nonReentrant returns(uint) {
    return 1;
  }
}
