// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Eip712Test} from "../Eip712Test.sol";

struct SelfDeclared {
  uint256 x;
}

/// The case passes while nothing is excluded and fails once `test/excluded/**`
/// is. A test's own source is excluded like any other file.
contract SelfExcludedStructTest is Eip712Test {
  function test_aStructTheTestSourceItselfDeclares() public pure {
    assertTypeHash("SelfDeclared", "SelfDeclared(uint256 x)");
  }
}
