// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Handler} from "../contracts/Handler.sol";

// The invariant fuzzer targets the contracts deployed in `setUp` that it can
// identify, so it needs to identify `Handler`.
contract InvariantTest {
  Handler handler;

  function setUp() public {
    handler = new Handler();
  }

  /// forge-config: default.invariant.runs = 5
  /// forge-config: default.invariant.depth = 5
  function invariantCountIsBounded() public view {
    require(handler.count() <= 5, "count should be bounded by the depth");
  }
}
