// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Permit} from "../contracts/Permit.sol";
import {Permit as VendorPermit} from "../contracts/vendor/Permit.sol";

interface Vm {
  function eip712HashType(
    string calldata typeNameOrDefinition
  ) external pure returns (bytes32 typeHash);
}

contract PermitTest {
  Vm private constant vm =
    Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

  // Both `Permit` declarations are reachable from this source, and this source
  // declares neither, so the name only resolves once `exclude` drops one.
  function test_hashesTheProjectPermitType() public pure {
    bytes32 typeHash = vm.eip712HashType("Permit");

    assert(typeHash == keccak256("Permit(address owner,uint256 value)"));
  }
}
