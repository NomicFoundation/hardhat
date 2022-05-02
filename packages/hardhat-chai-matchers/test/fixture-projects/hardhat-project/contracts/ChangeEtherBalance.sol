pragma solidity ^0.8.0;

contract ChangeEtherBalance {
  function returnHalf() public payable {
    payable(msg.sender).transfer(msg.value / 2);
  }

  receive() external payable {}
}