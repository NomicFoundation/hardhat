pragma solidity ^0.8.0;

contract Matchers {
  uint x;

  function succeeds() public {
    x++;
  }

  function revertsWithoutReasonString() public {
    require(false);
  }
}
