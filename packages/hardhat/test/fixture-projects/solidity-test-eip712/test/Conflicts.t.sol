// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Eip712Test} from "./Cheats.sol";
import {LeftHolder, RightHolder} from "../contracts/conflict/InOneFile.sol";
import {Clash} from "../contracts/conflict/ClashOther.sol";
import {Wrapper} from "../contracts/conflict/Wrapper.sol";

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
}
