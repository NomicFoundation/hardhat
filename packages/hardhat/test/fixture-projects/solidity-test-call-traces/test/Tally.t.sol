// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Tally} from "../contracts/Tally.sol";

contract TallyTest {
  function testAdd() public {
    Tally tally = new Tally();
    tally.add();
    require(tally.total() == 2, "total should be 2");
  }
}
