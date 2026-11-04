// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Eip712Test} from "./Cheats.sol";
import {Permit} from "../contracts/Permit.sol";
import {Permit as VendorPermit} from "../contracts/vendor/Permit.sol";

contract PermitTest is Eip712Test {
  // Both `Permit` declarations are reachable from this source, and this source
  // declares neither, so the name only resolves once `exclude` drops one.
  function test_hashesTheProjectPermitType() public pure {
    assertTypeHash("Permit", "Permit(address owner,uint256 value)");
  }
}
