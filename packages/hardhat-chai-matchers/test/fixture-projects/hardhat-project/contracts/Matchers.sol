// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

contract Matchers {
  uint x;

  function succeeds() public {
    x++;
  }

  function succeedsView() public view returns (uint) {
    return x;
  }

  function revertsWith(string memory reason) public {
    x++;
    require(false, reason);
  }

  function revertsWithView(string memory reason) public pure {
    require(false, reason);
  }

  function revertsWithoutReasonString() public {
    x++;
    require(false);
  }

  function revertsWithoutReasonStringView() public pure {
    require(false);
  }

  function panicAssert() public {
    x++;
    assert(false);
  }

  function panicAssertView() public {
    x++;
    assert(false);
  }

  function panicUnderflow(uint n) public {
    n--;
  }

  function panicUnderflowView(uint n) public pure {
    n--;
  }
}
