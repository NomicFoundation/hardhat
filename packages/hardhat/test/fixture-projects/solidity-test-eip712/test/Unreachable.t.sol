// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Eip712Test} from "./Eip712Test.sol";

/// `contracts/Unreachable.sol` is compiled with the project but imported by no
/// test, so no test reaches its struct.
contract UnreachableStructTest is Eip712Test {
  function test_aStructNoImportReaches() public pure {
    vm.eip712HashType("Unreachable");
  }
}
