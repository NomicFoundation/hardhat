// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

contract RevertWhenDeployedFromFirstAccount {
  constructor() {
    require(
      msg.sender != 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,
      "Cannot deploy from Hardhat account 1"
    );
  }
}
