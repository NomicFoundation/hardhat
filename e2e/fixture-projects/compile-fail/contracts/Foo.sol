// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Foo {
  uint public x;
  
  error ValueTooHigh(uint currentValue);

  function inc() public {
    x++;
    if (x > 100) {
      revert ValueTooHigh(x);
    }
  }
}
