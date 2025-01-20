// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;

contract Foo {
  bool public isFoo = true;
  uint256 public x = 1;

  function inc() public {
    x++;
  }

  function incByPositiveNumber(uint256 n) public {
    require(n > 0, "n must be positive");
    x += n;
  }

  function incTwoNumbers(uint256 first, uint256 second) public {
    x += first;
    x += second;
  }
}
