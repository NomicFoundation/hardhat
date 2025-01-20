// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract Greeter {
  string private _greeting;

  constructor(string memory greeting) {
    _greeting = greeting;
  }

  function getGreeting() public view returns (string memory) {
    return _greeting;
  }
}
