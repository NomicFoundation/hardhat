// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./BasicLibrary.sol";

using BasicLibrary for uint;

contract ContractWithLibrary {
  function readonlyFunction(uint num) public pure returns (uint) {
    return num.addTwo();
  }
}
