// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Bumper} from "../contracts/Bumper.sol";

contract BumperTest {
  function testBumpBy() public {
    Bumper bumper = new Bumper();
    bumper.bump();
    bumper.bumpBy(7);
  }
}
