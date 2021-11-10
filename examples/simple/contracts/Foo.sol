// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Foo {
  uint public x = 10;

  function inc() public {
    x++;
  }
}

contract Bar {
  address public a;

  constructor (address _a) {a=_a;}
}

contract Qux {
  address public a;

  constructor (address _a) {a=_a;}
}
