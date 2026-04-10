// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {A} from "@dup/A.sol";
import {B} from "@dup/B.sol";

contract ImportAB {
  function value() external pure returns (uint256) {
    return A.value() + B.value();
  }
}
