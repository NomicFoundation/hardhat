// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Eip712Test} from "./Cheats.sol";
import {Delegation} from "../contracts/Delegation.sol";

contract VendorStructsTest is Eip712Test {
  function test_collectsAStructFromAPackageDependency() public pure {
    assertTypeHash("VendorPermit", "VendorPermit(address spender,uint256 nonce)");
  }

  function test_inlinesADependencyFromAPackageDependency() public pure {
    assertTypeHash(
      "Delegation",
      "Delegation(VendorPermit permit,uint256 expiry)"
      "VendorPermit(address spender,uint256 nonce)"
    );
  }
}
