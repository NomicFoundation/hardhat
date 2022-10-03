// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Foo {
  uint public x = 10;

  function inc(uint n) public {
    require(n > 0, "n must be positive");
    x+=n;
  }
}

contract Bar {
  address public a;

  constructor (address _a) {a=_a;}
}

contract Qux {
  address public a;

  constructor (address _a, uint n) {
    require(n > 0, "n must be positive");
    a=_a;
  }
}
