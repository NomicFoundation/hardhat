// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Clash} from "./Clash.sol";

// Resolves `Clash` to one declaration. A canonical type names a dependency by
// its bare name, so a test reaching both declarations cannot encode this
// struct.
struct Wrapper {
  Clash clash;
  uint256 n;
}
