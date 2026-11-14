// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Reaches `Clash` two imports away: this file imports `ClashRelay.sol`,
// which imports `Clash.sol`, and neither name it directly.
import "./ClashRelay.sol";

struct TransitiveClash {
  Clash clash;
  uint256 z;
}
