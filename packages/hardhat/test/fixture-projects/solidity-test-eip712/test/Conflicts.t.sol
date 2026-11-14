// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Eip712Test} from "./Eip712Test.sol";
import {LeftHolder, RightHolder} from "../contracts/conflict/InOneFile.sol";
import {Clash} from "../contracts/conflict/ClashOther.sol";
import {Wrapper} from "../contracts/conflict/Wrapper.sol";
import {TransitiveClash} from "../contracts/conflict/TransitiveClash.sol";
// Unused by name: both imports exist only to make the two `Ledger`
// declarations reachable from one test.
import {LedgerAHolder} from "../contracts/conflict/LedgerA.sol";
import {LedgerBHolder} from "../contracts/conflict/LedgerB.sol";

/// Every case here reaches two declarations of one name and declares neither,
/// so each lookup is expected to fail with the reason the harness asserts.
contract ConflictingStructsTest is Eip712Test {
  function test_twoContractsInOneFileDeclareTheName() public pure {
    vm.eip712HashType("Conflict");
  }

  function test_twoFilesDeclareTheName() public pure {
    vm.eip712HashType("Clash");
  }

  function test_aStructDependsOnTheClashingName() public pure {
    vm.eip712HashType("Wrapper");
  }

  // `TransitiveClash.sol` reaches `Clash` through `ClashRelay.sol`, so the
  // ambiguity is detected two imports away rather than at the direct import
  // `Wrapper.sol` tests above.
  function test_aStructTransitivelyReachesTheClashingName() public pure {
    vm.eip712HashType("TransitiveClash");
  }

  // `LedgerAHolder.Ledger` and `LedgerBHolder.Ledger` agree on every
  // EIP-712-encodable member; only a mapping neither can encode tells them
  // apart, so the clash is a conflict rather than a non-encodable rejection.
  function test_twoFilesDeclareTheNameDifferingOnlyInANonEncodableMember()
    public
    pure
  {
    vm.eip712HashType("Ledger");
  }
}
