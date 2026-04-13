// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

import {C} from "@alt/C.sol";

contract ImportC {
  function value() external pure returns (uint256) {
    return C.value();
  }
}
