// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Eip712Test} from "./Eip712Test.sol";
import {NeedsExcluded} from "../contracts/NeedsExcluded.sol";

/// Both cases pass while nothing is excluded, and both fail once
/// `contracts/excluded/**` is.
contract ExcludedStructsTest is Eip712Test {
  function test_theOnlyFileDeclaringTheName() public pure {
    assertTypeHash("OnlyExcluded", "OnlyExcluded(uint256 x)");
  }

  function test_aStructDependingOnThatName() public pure {
    assertTypeHash(
      "NeedsExcluded",
      "NeedsExcluded(OnlyExcluded inner,bool flag)OnlyExcluded(uint256 x)"
    );
  }
}
