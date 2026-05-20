// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITestInterface {
  function test_interface() external;
}

contract InterfaceImpl is ITestInterface {
  function test_interface() external pure override {
    require(true, "interface impl runs");
  }
}
