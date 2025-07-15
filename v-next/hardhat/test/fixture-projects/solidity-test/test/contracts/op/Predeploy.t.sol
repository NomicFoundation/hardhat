// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../../contracts/Predeploy.sol";

contract PredeployTest {
  Predeploy predeploy;

  function setUp() public {
    predeploy = new Predeploy();
  }

  function testGetPredeploySize() public view {
    require(
      predeploy.getPredeploySize() > 0,
      "Predeploy size should be greater than 0"
    );
  }
}
