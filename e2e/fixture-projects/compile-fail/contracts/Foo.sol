// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Foo {
  uint public x;

  function inc() public {
    x++;
    error
  }
}
