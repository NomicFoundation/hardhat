// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Eip712Test} from "./Cheats.sol";
import {Twin} from "../contracts/duplicate/Left.sol";
import {Twin as RightTwin} from "../contracts/duplicate/Right.sol";

contract DuplicateStructsTest is Eip712Test {
  function test_collapsesIdenticalDeclarationsOfOneName() public pure {
    assertTypeHash("Twin", "Twin(uint256 x,address owner)");
  }
}
