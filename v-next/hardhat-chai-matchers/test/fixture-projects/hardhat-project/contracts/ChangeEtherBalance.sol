// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ChangeEtherBalance {
  function returnHalf() public payable {
    payable(msg.sender).transfer(msg.value / 2);
  }

  function transferTo(address addr) public payable {
    payable(addr).transfer(msg.value);
  }

  receive() external payable {}
}
