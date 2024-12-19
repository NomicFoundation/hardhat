// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract BasicContract {
  uint public savedArg;
  address public sender;

  event BasicEvent(uint eventArg);

  constructor(address _sender) {
    sender = _sender;
  }

  receive() external payable {}

  function basicFunction(uint funcArg) public {
    // Uncomment this line, and the import of "hardhat/console.sol", to print a log in your terminal
    // console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

    emit BasicEvent(funcArg);
  }

  function otherFunction(uint arg) public payable {
    savedArg = arg;
  }
}
