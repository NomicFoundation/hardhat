// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {OnlyExcluded} from "./excluded/Only.sol";

struct NeedsExcluded {
  OnlyExcluded inner;
  bool flag;
}
