// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {VendorPermit} from "vendor-structs/src/Vendor.sol";

struct Delegation {
  VendorPermit permit;
  uint256 expiry;
}
