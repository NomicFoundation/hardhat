// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Eip712Test} from "./Eip712Test.sol";
import {Clash as ImportedClash} from "../contracts/conflict/ClashOther.sol";

// A different shape than `contracts/conflict/Clash.sol`'s, so a direct lookup
// can tell which declaration answered. The import above is unused by name: it
// exists only to make `ClashOther.sol`'s `Clash` reachable alongside this
// one, so the name is ambiguous for anything that merely references it.
struct Clash {
  bool settled;
  uint256 amount;
}

// Resolves `Clash` to this file's own declaration under Solidity's own
// scoping rules, but EDR inlines a dependency by its bare name alone, so the
// name being ambiguous elsewhere in the import graph still rejects this.
struct AsksForClash {
  Clash inner;
  uint256 n;
}

contract AskingSourceWinsTest is Eip712Test {
  function test_theAskingSourceWinsTheClash() public pure {
    assertTypeHash("Clash", "Clash(bool settled,uint256 amount)");
  }

  function test_aStructInTheAskingSourceReferencesTheClashingName()
    public
    pure
  {
    vm.eip712HashType("AsksForClash");
  }
}
