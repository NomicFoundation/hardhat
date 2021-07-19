pragma solidity ^0.8.0;

contract C {
  uint immutable x = 16448250;
  address immutable a = 0xFEe9686eA76eCb04b8bB8E1AC29D7b1bCAeA283a;
  bool immutable b = false;

  function get2X () public returns (uint) {
    if (b) {
      return 2*x;
    }
  }

  function getAddress() public returns (address) {
    if (!b) {
      return a;
    }
  }

  function test () external {
    revert("C failed");
  }

}
