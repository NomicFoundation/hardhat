// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Eip712Test} from "./Cheats.sol";
import {HoldsMapping, WithMapping} from "../contracts/nonencodable/Mappings.sol";

/// Both lookups are expected to fail because EIP-712 has no encoding for a
/// mapping, and that propagates to whatever depends on it.
contract NonEncodableStructsTest is Eip712Test {
  function test_aMemberHasNoEip712Encoding() public pure {
    vm.eip712HashType("WithMapping");
  }

  function test_aDependencyHasNoEip712Encoding() public pure {
    vm.eip712HashType("HoldsMapping");
  }
}
