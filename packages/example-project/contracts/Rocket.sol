// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Rocket {
  string public name;
  string public status;

  event LaunchWithoutArgs();
  event LaunchWithTwoStringArgs(string u, string v);

  constructor(string memory _name) {
    name = _name;
    status = "ignition";
  }

  function launch() public {
    status = "lift-off";

    emit LaunchWithoutArgs();
    emit LaunchWithTwoStringArgs(name, status);
  }
}
