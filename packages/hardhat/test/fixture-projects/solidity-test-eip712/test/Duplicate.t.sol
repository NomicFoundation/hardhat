// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Eip712Test} from "./Eip712Test.sol";
import {Twin} from "../contracts/duplicate/Left.sol";
// Unused by name: the import exists only to make `Right.sol` reachable, so
// its identical `Twin` collapses with `Left.sol`'s instead of being absent.
import {Twin as RightTwin} from "../contracts/duplicate/Right.sol";

contract DuplicateStructsTest is Eip712Test {
  function test_collapsesIdenticalDeclarationsOfOneName() public pure {
    assertTypeHash("Twin", "Twin(uint256 x,address owner)");
  }
}
