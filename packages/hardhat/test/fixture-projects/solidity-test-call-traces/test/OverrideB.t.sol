// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {OverrideBase} from "./OverrideA.t.sol";
import {Counter} from "../contracts/Counter.sol";

contract OverrideBTest is OverrideBase {
  function testB() public {
    Counter counter = deployCounter();
    counter.increment();
  }
}
