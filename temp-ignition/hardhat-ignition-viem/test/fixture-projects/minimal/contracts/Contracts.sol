// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;

contract Foo {
  event IncEvent(address indexed sender);

  bool public isFoo = true;
  uint256 public x = 1;

  function inc() public {
    x++;
    emit IncEvent(msg.sender);
  }

  function incByPositiveNumber(uint256 n) public returns (uint256) {
    require(n > 0, "n must be positive");
    x += n;
    return x;
  }

  function incTwoNumbers(uint256 first, uint256 second) public {
    x += first;
    x += second;
  }
}

contract Bar {
  bool public isBar = true;
}

contract OwnerSender {
  address public owner;

  constructor() {
    owner = msg.sender;
  }
}
